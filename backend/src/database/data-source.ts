import 'dotenv/config';

import { DataSource } from 'typeorm';
import { User } from '../modules/users/entities/user.entity';
import { ServiceType } from '../modules/service-types/entities/service-type.entity';
import { ServiceRequest } from '../modules/service-requests/entities/service-request.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',

  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,

  entities: [User, ServiceType, ServiceRequest],

  migrations: ['src/database/migrations/*.ts'],

  synchronize: false,
});
