import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { UserRole } from '../enums/user-role.enum';

/** Roles an admin can create from the dashboard (customers self-register). */
export const ADMIN_CREATABLE_ROLES = [
  UserRole.TECHNICIAN,
  UserRole.SUPERVISOR,
] as const;

export class CreateUserDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(150)
  fullName!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(150)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsIn(ADMIN_CREATABLE_ROLES)
  role!: UserRole.TECHNICIAN | UserRole.SUPERVISOR;
}
