import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * 统一响应格式接口
 */
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  attribute?: any;
}

/**
 * 响应转换拦截器
 * 统一包装成功响应为标准格式
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<any>> {
    return next.handle().pipe(
      map((result) => {
        // 检查是否是分页结果
        if (result && result.data !== undefined && result.attribute !== undefined) {
          return {
            code: 0,
            message: 'success',
            data: result.data,
            attribute: result.attribute,
          };
        }
        
        // 普通响应
        return {
          code: 0,
          message: 'success',
          data: result,
        };
      }),
    );
  }
}
