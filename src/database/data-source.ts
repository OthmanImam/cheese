import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

/** TypeORM CLI data source — used for migration:run / migration:generate */
export default new DataSource({
  type:       'postgres',
  host:       process.env.DB_HOST     ?? 'localhost',
  port:       parseInt(process.env.DB_PORT ?? '5432', 10),
  database:   process.env.DB_NAME     ?? 'cheese_wallet',
  username:   process.env.DB_USER     ?? 'postgres',
  password:   process.env.DB_PASSWORD ?? '',
  entities:   ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
});
