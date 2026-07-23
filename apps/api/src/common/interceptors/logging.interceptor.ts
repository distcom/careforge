import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const contentLength = response.get('content-length') || 0;
          this.logger.log(
            `${method} ${url} ${statusCode} ${contentLength} - ${Date.now() - now}ms - ${ip} ${userAgent}`,
          );
        },
        error: (error) => {
          this.logger.error(
            `${method} ${url} - ${Date.now() - now}ms - ${ip} - ${error.message}`,
          );
        },
      }),
    );
  }
}
