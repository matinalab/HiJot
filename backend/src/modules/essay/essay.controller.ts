import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { EssayService } from './essay.service';
import { CreateEssayDto } from './dto/create-essay.dto';
import { UpdateEssayDto } from './dto/update-essay.dto';

@Controller('essay')
export class EssayController {
  constructor(private readonly essayService: EssayService) {}

  @Post()
  create(@Body() createEssayDto: CreateEssayDto) {
    return this.essayService.create(createEssayDto);
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 20;
    return this.essayService.findAll(pageNum, pageSizeNum);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.essayService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEssayDto: UpdateEssayDto,
  ) {
    return this.essayService.update(id, updateEssayDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.essayService.remove(id);
  }
}
