import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';

export const databaseConfig: TypeOrmModuleAsyncOptions = {
  useFactory: (config: ConfigService) => ({
    type: 'mysql' as const,
    host: config.get<string>('DB_HOST', 'localhost'),
    port: config.get<number>('DB_PORT', 3306),
    username: config.get<string>('DB_USERNAME', 'root'),
    password: config.get<string>('DB_PASSWORD', ''),
    database: config.get<string>('DB_DATABASE', 'kpital360'),
    entities: [__dirname + '/../modules/**/entities/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
    synchronize: false,
    logging: false,
    charset: 'utf8mb4',
    // Retry applies to initial datasource bootstrap failures.
    retryAttempts: config.get<number>('DB_RETRY_ATTEMPTS', 5),
    retryDelay: config.get<number>('DB_RETRY_DELAY_MS', 3000),
    poolSize: config.get<number>('DB_POOL_SIZE', 10),
    extra: {
      waitForConnections: true,
      connectionLimit: config.get<number>('DB_POOL_SIZE', 10),
      maxIdle: config.get<number>('DB_POOL_MAX_IDLE', 10),
      // Recycle idle sockets before typical home-router/NAT idle cuts.
      idleTimeout: config.get<number>('DB_POOL_IDLE_TIMEOUT_MS', 240000),
      queueLimit: 0,
      connectTimeout: config.get<number>('DB_CONNECT_TIMEOUT_MS', 60000),
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    },
  }),
  inject: [ConfigService],
};
