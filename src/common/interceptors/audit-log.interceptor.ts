import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AUDIT_LOG_ACTION_KEY } from '../decorators/audit-log.decorator';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AuditLog');

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const action = this.reflector.getAllAndOverride<string>(
      AUDIT_LOG_ACTION_KEY,
      [context.getHandler(), context.getClass()],
    );

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse();

    // If explicit audit log action is configured or request is a mutating method (POST, PUT, PATCH, DELETE)
    const isMutatingMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(
      request.method,
    );

    if (!action && !isMutatingMethod) {
      return next.handle();
    }

    const startTime = Date.now();
    const user = request.user;
    const clientIp =
      request.ip ||
      request.headers['x-forwarded-for'] ||
      request.socket.remoteAddress;

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - startTime;
          const auditPayload = {
            timestamp: new Date().toISOString(),
            action:
              action ||
              `${request.method} ${request.route?.path || request.url}`,
            userId: user?.userId || user?.sub || 'ANONYMOUS',
            role: user?.role || 'UNAUTHENTICATED',
            method: request.method,
            path: request.originalUrl || request.url,
            statusCode: response.statusCode,
            ip: clientIp,
            durationMs,
          };

          this.logger.log(`[AUDIT_EVENT] ${JSON.stringify(auditPayload)}`);
        },
        error: (error) => {
          const durationMs = Date.now() - startTime;
          const auditPayload = {
            timestamp: new Date().toISOString(),
            action:
              action ||
              `${request.method} ${request.route?.path || request.url}`,
            userId: user?.userId || user?.sub || 'ANONYMOUS',
            role: user?.role || 'UNAUTHENTICATED',
            method: request.method,
            path: request.originalUrl || request.url,
            statusCode: error.status || 500,
            ip: clientIp,
            durationMs,
            error: error.message,
          };

          this.logger.warn(`[AUDIT_FAILED] ${JSON.stringify(auditPayload)}`);
        },
      }),
    );
  }
}
