import 'dotenv/config';
import { DataSource } from 'typeorm';

/**
 * Configuración para el CLI de TypeORM (migraciones).
 * Se usa con: npx typeorm -d src/typeorm.config.ts migration:run
 */
export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'kpital360',
  entities: [__dirname + '/modules/**/entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
  synchronize: false,
  charset: 'utf8mb4',
  poolSize: parseInt(process.env.DB_POOL_SIZE || '10', 10),
  extra: {
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_POOL_SIZE || '10', 10),
    maxIdle: parseInt(process.env.DB_POOL_MAX_IDLE || '10', 10),
    idleTimeout: parseInt(process.env.DB_POOL_IDLE_TIMEOUT_MS || '240000', 10),
    queueLimit: 0,
    connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT_MS || '60000', 10),
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  },
});
