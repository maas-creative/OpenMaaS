import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiError } from '@openmaas/types';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let error: ApiError;

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const { message, error: errorType, ...details } = exceptionResponse as Record<string, unknown>;
      error = {
        code: (errorType as string) || HttpStatus[status],
        message: Array.isArray(message) ? message.join(', ') : (message as string),
        details: Object.keys(details).length > 0 ? details : undefined,
      };
    } else {
      error = {
        code: HttpStatus[status],
        message: exceptionResponse as string,
      };
    }

    response.status(status).json({
      success: false,
      error,
      timestamp: new Date(),
      path: request.url,
      method: request.method,
    });
  }
}
