import { Injectable, UnauthorizedException, ConflictException, Logger, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { RegisterDto, LoginDto, TokenResponse } from './dto/auth.dto';

/**
 * SECURITY:
 * - Public registration creates ONLY patient/pending accounts
 * - Staff accounts are provisioned exclusively by administrators
 * - JWT secrets have NO fallback — startup fails if missing
 * - Refresh tokens are rotated on every use (single-use)
 * - Refresh token reuse is detected and triggers session revocation
 * - Account lockout after repeated failed attempts
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtSecret: string;
  private readonly jwtRefreshSecret: string;
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION_SECONDS = 900; // 15 minutes

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redis: RedisService,
  ) {
    // SECURITY: Fail startup if secrets are not configured
    this.jwtSecret = this.configService.get<string>('JWT_SECRET');
    if (!this.jwtSecret) {
      throw new Error('FATAL: JWT_SECRET environment variable is required. Server cannot start without it.');
    }

    this.jwtRefreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!this.jwtRefreshSecret) {
      throw new Error('FATAL: JWT_REFRESH_SECRET environment variable is required. Server cannot start without it.');
    }
  }

  /**
   * Public registration — creates ONLY a patient account in pending state.
   * Staff/clinician/admin accounts must be created via admin provisioning.
   */
  async register(dto: RegisterDto): Promise<TokenResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        isActive: false, // Pending until email verification or admin approval
      },
    });

    // SECURITY: Always assign only the 'patient' role for public registration
    const patientRole = await this.prisma.role.findFirst({ where: { name: 'patient' } });
    if (patientRole) {
      await this.prisma.userRole.create({
        data: { userId: user.id, roleId: patientRole.id },
      });
    }

    this.logger.log(`[AUDIT] Public registration: email=${dto.email.toLowerCase()} role=patient status=pending`);

    return this.generateTokens(user.id, user.email);
  }

  async login(dto: LoginDto): Promise<TokenResponse> {
    const email = dto.email.toLowerCase();

    // SECURITY: Account lockout check
    const lockoutKey = `login-lockout:${email}`;
    const isLocked = await this.redis.get(lockoutKey);
    if (isLocked) {
      this.logger.warn(`[AUDIT] Login attempt on locked account: ${email}`);
      throw new UnauthorizedException('Account temporarily locked. Try again later.');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { roles: { include: { role: true } } },
    });

    if (!user || !user.isActive) {
      await this.recordFailedAttempt(email);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      await this.recordFailedAttempt(email);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Clear failed attempts on successful login
    await this.redis.del(`login-attempts:${email}`);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    this.logger.log(`[AUDIT] Successful login: userId=${user.id} email=${email}`);

    return this.generateTokens(user.id, user.email);
  }

  /**
   * SECURITY: Refresh token rotation with reuse detection.
   * Each refresh token is single-use. If a used token is presented again,
   * all sessions for that user are revoked (potential token theft).
   */
  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.jwtRefreshSecret,
      });

      // Check if this token has already been used (reuse detection)
      const tokenKey = `refresh-token:${payload.jti || payload.sub}`;
      const isUsed = await this.redis.get(tokenKey);

      if (isUsed) {
        // SECURITY: Token reuse detected — revoke all user sessions
        this.logger.warn(`[AUDIT] Refresh token REUSE detected for userId=${payload.sub}. Revoking all sessions.`);
        await this.revokeAllUserSessions(payload.sub);
        throw new UnauthorizedException('Token reuse detected. All sessions revoked.');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Mark current token as used (rotation)
      await this.redis.set(tokenKey, 'used', 7 * 24 * 3600); // 7 days TTL

      return this.generateTokens(user.id, user.email);
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
        facilities: { select: { facilityId: true } },
      },
    });

    if (!user || !user.isActive) return null;

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles.map((ur) => ur.role.name),
      permissions: user.roles.flatMap((ur) =>
        ur.role.permissions.map((rp) => rp.permission.code),
      ),
      facilityIds: user.facilities.map((f) => f.facilityId),
    };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    // SECURITY: Always return success to prevent email enumeration
    if (!user) return;

    const resetToken = uuidv4();
    await this.redis.set(`password-reset:${resetToken}`, { userId: user.id }, 3600);
    this.logger.log(`[AUDIT] Password reset token generated for userId=${user.id}`);
    // TODO: Send email via MailService with secure, single-use link
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const data = await this.redis.get<{ userId: string }>(`password-reset:${token}`);
    if (!data) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: data.userId },
      data: { passwordHash },
    });

    // SECURITY: Invalidate token after use AND revoke all sessions
    await this.redis.del(`password-reset:${token}`);
    await this.revokeAllUserSessions(data.userId);
    this.logger.log(`[AUDIT] Password reset completed for userId=${data.userId}. All sessions revoked.`);
  }

  /**
   * Revoke all sessions for a user (used on password reset, token reuse, admin action)
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.redis.set(`sessions-revoked:${userId}`, Date.now().toString(), 7 * 24 * 3600);
    this.logger.log(`[AUDIT] All sessions revoked for userId=${userId}`);
  }

  // --- Private Helpers ---

  private async recordFailedAttempt(email: string): Promise<void> {
    const key = `login-attempts:${email}`;
    const current = await this.redis.get<number>(key);
    const attempts = (current || 0) + 1;

    if (attempts >= AuthService.MAX_LOGIN_ATTEMPTS) {
      // Lock the account
      await this.redis.set(`login-lockout:${email}`, 'locked', AuthService.LOCKOUT_DURATION_SECONDS);
      await this.redis.del(key);
      this.logger.warn(`[AUDIT] Account LOCKED after ${attempts} failed attempts: ${email}`);
    } else {
      await this.redis.set(key, attempts, AuthService.LOCKOUT_DURATION_SECONDS);
    }
  }

  private async generateTokens(userId: string, email: string): Promise<TokenResponse> {
    const jti = uuidv4(); // Unique token ID for rotation tracking
    const payload = { sub: userId, email, jti };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.jwtSecret,
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.jwtRefreshSecret,
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: 900 };
  }
}
