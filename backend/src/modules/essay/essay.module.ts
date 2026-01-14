import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EssayService } from './essay.service';
import { EssayController } from './essay.controller';
import { Essay } from '@/database/entities/essay.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Essay])],
  controllers: [EssayController],
  providers: [EssayService],
  exports: [EssayService],
})
export class EssayModule {}
