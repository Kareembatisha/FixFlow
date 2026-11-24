import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';

import { AppModule } from '../../app.module';
import { UsersService } from '../../modules/users/users.service';
import { UserRole } from '../../modules/users/enums/user-role.enum';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const fullName = process.env.ADMIN_FULL_NAME?.trim();
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    // Validate required environment variables.
    if (!fullName || !email || !password) {
      throw new Error(
        'ADMIN_FULL_NAME, ADMIN_EMAIL and ADMIN_PASSWORD are required.',
      );
    }

    // Validate password length according to bcrypt limits.
    if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
      throw new Error(
        'Admin password must be at least 12 characters and no more than 72 bytes.',
      );
    }

    const usersService = app.get(UsersService);

    // Check whether the admin already exists.
    const existingUser = await usersService.findByEmail(email);

    if (existingUser) {
      if (existingUser.role !== UserRole.ADMIN) {
        throw new Error(
          'The configured admin email already belongs to a non-admin user. Choose another email.',
        );
      }

      console.log('Admin user already exists. No changes were made.');

      return;
    }

    // Hash the admin password before saving it.
    const passwordHash = await bcrypt.hash(password, 12);

    // Create the admin user directly with ADMIN role.
    const admin = await usersService.create({
      fullName,
      email,
      passwordHash,
      phone: null,
      role: UserRole.ADMIN,
    });

    console.log(`Admin user created successfully: ${admin.email}`);
  } finally {
    await app.close();
  }
}

bootstrap().catch((error: unknown) => {
  console.error('Admin seed failed:', error);
  process.exitCode = 1;
});
