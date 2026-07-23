import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/auth.decorator';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  check() {
    return {
      status: 'ok',
      service: 'CareForge API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health check with dependencies' })
  async detailed() {
    const checks: Record<string, { status: string; latency?: number }> = {};

    const dbStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'healthy', latency: Date.now() - dbStart };
    } catch {
      checks.database = { status: 'unhealthy' };
    }

    const redisStart = Date.now();
    try {
      await this.redis.getClient().ping();
      checks.redis = { status: 'healthy', latency: Date.now() - redisStart };
    } catch {
      checks.redis = { status: 'unhealthy' };
    }

    const allHealthy = Object.values(checks).every((c) => c.status === 'healthy');

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      service: 'CareForge API',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}
