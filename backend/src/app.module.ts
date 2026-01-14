import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TodoModule } from './modules/todo/todo.module';
import { EssayModule } from './modules/essay/essay.module';
import { Todo } from './database/entities/todo.entity';
import { Essay } from './database/entities/essay.entity';
import { Config } from './database/entities/config.entity';
import * as path from 'path';

/**
 * 获取 SQLite 数据库路径
 * 优先使用环境变量 DB_PATH，否则使用默认路径
 */
function getDatabasePath(configService: ConfigService): string {
  const dbPath = configService.get<string>('DB_PATH');
  if (dbPath) {
    return dbPath;
  }
  return path.join(process.cwd(), 'hijot.db');
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbPath = getDatabasePath(configService);
        return {
          type: 'better-sqlite3',
          database: dbPath,
          entities: [Todo, Essay, Config],
          synchronize: true, // 自动同步表结构
          logging: false,
        };
      },
      inject: [ConfigService],
    }),
    TodoModule,
    EssayModule,
  ],
})
export class AppModule {}
