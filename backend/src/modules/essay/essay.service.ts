import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Essay } from '@/database/entities/essay.entity';
import { CreateEssayDto } from './dto/create-essay.dto';
import { UpdateEssayDto } from './dto/update-essay.dto';
import { PaginatedResult } from '@/common/interfaces/paginated-result.interface';

@Injectable()
export class EssayService {
  constructor(
    @InjectRepository(Essay)
    private essayRepository: Repository<Essay>,
  ) {}

  /**
   * 创建随笔
   */
  async create(createEssayDto: CreateEssayDto): Promise<Essay> {
    const essay = this.essayRepository.create({
      ...createEssayDto,
      status: 0,
    });
    return await this.essayRepository.save(essay);
  }

  /**
   * 分页查询随笔列表
   */
  async findAll(
    page: number = 1,
    pageSize: number = 20,
  ): Promise<PaginatedResult<Essay>> {
    const [data, total] = await this.essayRepository.findAndCount({
      order: { time: 'DESC' },
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
   * 根据ID查询单个随笔
   */
  async findOne(id: number): Promise<Essay> {
    const essay = await this.essayRepository.findOne({ where: { id } });
    if (!essay) {
      throw new NotFoundException(`随笔 #${id} 不存在`);
    }
    return essay;
  }

  /**
   * 更新随笔
   */
  async update(id: number, updateEssayDto: UpdateEssayDto): Promise<Essay> {
    const essay = await this.findOne(id); // 先检查是否存在
    await this.essayRepository.update(id, updateEssayDto);
    return { ...essay, ...updateEssayDto };
  }

  /**
   * 删除随笔
   */
  async remove(id: number): Promise<void> {
    await this.findOne(id); // 先检查是否存在
    await this.essayRepository.delete(id);
  }
}
