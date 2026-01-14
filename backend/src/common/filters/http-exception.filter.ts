import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * 全局HTTP异常过滤器
 * 统一处理所有异常，返回标准化的错误响应格式
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as Record<string, any>;
        // 处理 class-validator 的验证错误
        if (Array.isArray(responseObj.message)) {
          message = responseObj.message.join('; ');
        } else {
          message = responseObj.message || exception.message;
        }
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      // 处理非HTTP异常（如数据库错误等）
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = '服务器内部错误';
      
      // 记录详细错误日志
      this.logger.error(
        `非预期错误: ${exception.message}`,
        exception.stack,
      );
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = '未知错误';
    }

    const errorResponse = {
      code: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // 记录错误日志（非500错误使用warn级别）
    if (status >= 500) {
      this.logger.error(`${request.method} ${request.url}`, JSON.stringify(errorResponse));
    } else {
      this.logger.warn(`${request.method} ${request.url} - ${status} ${message}`);
    }

    response.status(status).json(errorResponse);
  }
}

