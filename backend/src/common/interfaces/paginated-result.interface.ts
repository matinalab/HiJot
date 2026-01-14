/**
 * 分页属性接口
 */
export interface PaginationAttribute {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 分页响应接口
 */
export interface PaginatedResult<T> {
  data: T[];
  attribute: PaginationAttribute;
}
