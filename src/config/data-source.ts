// src/config/data-source.ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
const usePostgres = !!databaseUrl || !!process.env.DB_HOST;

let dataSourceConfig: any;

if (databaseUrl) {
  // Use DATABASE_URL if provided (for production/Railway)
  dataSourceConfig = {
    type: 'postgres',
    url: databaseUrl,
    entities: [join(__dirname, '../**/*.entity.{ts,js}')],
    migrations: [join(__dirname, '../migrations/*.{ts,js}')],
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV !== 'production',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  };
} else {
  // Local development: use SQLite (no server required)
  dataSourceConfig = {
    type: 'sqlite',
    database: (process.env.DB_NAME || 'cheese_wallet') + '.db',
    entities: [join(__dirname, '../**/*.entity.{ts,js}')],
    migrations: [join(__dirname, '../migrations/*.{ts,js}')],
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV !== 'production',
  };
}

export default new DataSource(dataSourceConfig);
