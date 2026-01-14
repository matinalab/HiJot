import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('todo')
export class Todo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 1024 })
  content: string;

  @Column({
    type: 'integer',
    name: 'end_time',
  })
  endTime: number;

  @Column({
    type: 'integer',
    name: 'notice_time',
    nullable: true,
  })
  noticeTime: number;

  @Column({ type: 'varchar', length: 128, nullable: true })
  remark: string;

  @Column({ type: 'integer', default: 0 })
  tag: number;

  @Column({ type: 'integer', default: 0, comment: '0:进行中 1:已完成 2:已删除' })
  status: number;

  @Column({ type: 'boolean', default: false, name: 'is_reminded', comment: '是否已提醒过' })
  isReminded: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
