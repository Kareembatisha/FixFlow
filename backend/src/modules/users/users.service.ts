import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { GetUsersQueryDto } from './dto/get-users-query.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
    });
  }

  async create(
    userData: Pick<User, 'fullName' | 'email' | 'passwordHash' | 'phone'> & {
      role?: UserRole;
    },
  ): Promise<User> {
    const user = this.userRepository.create(userData);

    return this.userRepository.save(user);
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }

  /** Public projection: never exposes the password hash. */
  private toPublic(user: User) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone ?? null,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  /** Active technicians for the assignment dialog, ordered by name. */
  async findActiveTechnicians() {
    const technicians = await this.userRepository.find({
      where: { role: UserRole.TECHNICIAN, isActive: true },
      order: { fullName: 'ASC' },
    });

    return technicians.map((user) => this.toPublic(user));
  }

  async findAll(query: GetUsersQueryDto) {
    const { page, limit, role, search } = query;

    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    if (search) {
      queryBuilder.andWhere(
        '(user.fullName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder
      .orderBy('user.createdAt', 'DESC')
      .addOrderBy('user.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [users, total] = await queryBuilder.getManyAndCount();

    return {
      items: users.map((user) => this.toPublic(user)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async createByAdmin(dto: CreateUserDto) {
    const existing = await this.findByEmail(dto.email);

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    try {
      const user = await this.create({
        fullName: dto.fullName,
        email: dto.email,
        passwordHash,
        phone: dto.phone ?? null,
        role: dto.role,
      });

      return this.toPublic(user);
    } catch (error) {
      const isDuplicateEmail =
        error instanceof QueryFailedError &&
        (error as QueryFailedError & { driverError?: { code?: string } })
          .driverError?.code === '23505';

      if (isDuplicateEmail) {
        throw new ConflictException('Email already registered');
      }

      throw error;
    }
  }
}
