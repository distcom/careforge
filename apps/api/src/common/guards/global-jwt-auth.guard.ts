import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/auth.decorator';

/**
 * SECURITY: Deny-by-default global authentication guard.
 *
 * All endpoints require authentication UNLESS explicitly marked with @Public().
 * This is registered as APP_GUARD in AppModule to ensure no endpoint
 * is accidentally left unprotected.
 */
@Injectable()
export class GlobalJwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // All non-public routes require valid JWT
    return super.canActivate(context);
  }
}
