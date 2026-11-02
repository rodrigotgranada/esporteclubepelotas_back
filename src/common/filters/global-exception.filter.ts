import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId =
      (request.headers['x-correlation-id'] as string) ||
      (request.headers['x-request-id'] as string) ||
      '';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let errorName = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, any>;
        message = resObj.message || exception.message;
        errorName = resObj.error || exception.name;
      }
    } else if (exception instanceof Error) {
      errorName = exception.name;
      const isProduction = process.env.NODE_ENV === 'production';
      message = isProduction ? 'Internal server error' : exception.message;

      this.logger.error(
        `[${correlationId}] Unhandled Exception: ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.error(
        `[${correlationId}] Unknown Exception occurred: ${JSON.stringify(exception)}`,
      );
    }

    const errorPayload = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId: correlationId || undefined,
      error: errorName,
      message,
    };

    response.status(status).json(errorPayload);
  }
}
