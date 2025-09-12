import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';

@Catch()
export class JSendExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Something went wrong';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody = exception.getResponse();

      return response.status(status).send({
        status: 'fail', // "fail" for user errors
        data:
          typeof responseBody === 'string'
            ? { message: responseBody }
            : responseBody,
      });
    }

    // Handle unexpected errors
    // Log full error details (including stack trace)
    Logger.error(
      `Exception thrown: ${JSON.stringify(message)}`,
      (exception as Error).stack,
    );
    return response.status(status).send({
      status: 'error',
      message: message,
      code: status,
    });
  }
}
