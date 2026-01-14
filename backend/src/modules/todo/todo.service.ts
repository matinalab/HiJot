import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo } from '@/database/entities/todo.entity';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { PaginatedResult } from '@/common/interfaces/paginated-result.interface';

@Injectable()
export class TodoService {
  constructor(
    @InjectRepository(Todo)
    private todoRepository: Repository<Todo>,
  ) {}

  /**
   * 创建待办事项
   */
  async create(createTodoDto: CreateTodoDto): Promise<Todo> {
    const todo = this.todoRepository.create({
      ...createTodoDto,
      status: 0,
    });
    return await this.todoRepository.save(todo);
  }

  /**
   * 分页查询待办事项
   */
  async findAll(
    page: number = 1,
    pageSize: number = 20,
    status?: number,
  ): Promise<PaginatedResult<Todo>> {
    const [data, total] = await this.todoRepository.findAndCount({
      where: status !== undefined ? { status } : undefined,
      order: { endTime: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      data,
      attribute: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * 根据ID查询单个待办事项
   */
  async findOne(id: number): Promise<Todo> {
    const todo = await this.todoRepository.findOne({ where: { id } });
    if (!todo) {
      throw new NotFoundException(`待办事项 #${id} 不存在`);
    }
    return todo;
  }

  /**
   * 更新待办事项
   */
  async update(id: number, updateTodoDto: UpdateTodoDto): Promise<Todo> {
    const todo = await this.findOne(id); // 先检查是否存在
    await this.todoRepository.update(id, updateTodoDto);
    return { ...todo, ...updateTodoDto };
  }

  /**
   * 软删除待办事项（标记为已删除状态）
   */
  async remove(id: number): Promise<void> {
    await this.findOne(id); // 先检查是否存在
    await this.todoRepository.update(id, { status: 2 });
  }

  /**
   * 获取待办事项统计信息
   * 使用数据库聚合查询优化性能
   */
  async getStats(): Promise<{ pending: number; completed: number; overdue: number }> {
    const now = Date.now();

    // 使用单次查询获取所有统计数据
    const result = await this.todoRepository
      .createQueryBuilder('todo')
      .select([
        'SUM(CASE WHEN todo.status = 0 THEN 1 ELSE 0 END) as pending',
        'SUM(CASE WHEN todo.status = 1 THEN 1 ELSE 0 END) as completed',
        `SUM(CASE WHEN todo.status = 0 AND todo.end_time <= ${now} THEN 1 ELSE 0 END) as overdue`,
      ])
      .where('todo.status != :deletedStatus', { deletedStatus: 2 })
      .getRawOne();

    return {
      pending: parseInt(result.pending) || 0,
      completed: parseInt(result.completed) || 0,
      overdue: parseInt(result.overdue) || 0,
    };
  }
}
