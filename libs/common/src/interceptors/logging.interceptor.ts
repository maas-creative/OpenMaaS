import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from '../logger';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body } = request;
    const now = Date.now();

    this.logger.log(`Incoming Request: ${method} ${url}`, 'LoggingInterceptor');

    if (process.env.NODE_ENV === 'development' && body) {
      this.logger.debug(`Request Body: ${JSON.stringify(body)}`, 'LoggingInterceptor');
    }

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const delay = Date.now() - now;
        this.logger.log(
          `Outgoing Response: ${method} ${url} - ${response.statusCode} - ${delay}ms`,
          'LoggingInterceptor',
        );
      }),
    );
  }
}
