import { DataSource } from 'typeorm';  // ← add this
import * as dotenv from 'dotenv';
dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASS     || 'postgres',
  database: process.env.DB_NAME     || 'cheese_pay',
  entities:   [__dirname + '/../**/*.entity.{ts,js}'],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
});