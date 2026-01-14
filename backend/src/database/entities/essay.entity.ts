import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('essay')
export class Essay {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '标题' })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'integer',
    name: 'time',
  })
  time: number;

  @Column({ type: 'integer', default: 0, comment: '0:展开 1:收起' })
  status: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
