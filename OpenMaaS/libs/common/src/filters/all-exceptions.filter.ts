import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../logger';
import { ApiError } from '@openmaas/types';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let error: ApiError = {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const { message, error: errorType, ...details } = exceptionResponse as any;
        error = {
          code: errorType || HttpStatus[status],
          message: Array.isArray(message) ? message.join(', ') : message,
          details: Object.keys(details).length > 0 ? details : undefined,
        };
      } else {
        error = {
          code: HttpStatus[status],
          message: exceptionResponse as string,
        };
      }
    } else if (exception instanceof Error) {
      error.message = exception.message;
      if (process.env.NODE_ENV !== 'production') {
        error.stack = exception.stack;
      }
    }

    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${error.message}`,
      exception instanceof Error ? exception.stack : undefined,
      'ExceptionFilter',
    );

    response.status(status).json({
      success: false,
      error,
      timestamp: new Date(),
      path: request.url,
      method: request.method,
    });
  }
}