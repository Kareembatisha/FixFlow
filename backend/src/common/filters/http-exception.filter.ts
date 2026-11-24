import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

import { ApiResponse } from '../interfaces/api-response.interface';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message = 'Internal server error';
    let errors: string[] | null = null;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (exceptionResponse && typeof exceptionResponse === 'object') {
      const errorResponse = exceptionResponse as {
        message?: string | string[];
      };

      if (Array.isArray(errorResponse.message)) {
        message = 'Validation failed';
        errors = errorResponse.message;
      } else if (typeof errorResponse.message === 'string') {
        message = errorResponse.message;
      }
    }

    if (exception instanceof HttpException && statusCode >= 500) {
      message = 'Internal server error';
      errors = null;
    }

    const body: ApiResponse<null> = {
      status: false,
      statusCode,
      meta: null,
      message,
      errors,
      data: null,
    };

    response.status(statusCode).json(body);
  }
}
