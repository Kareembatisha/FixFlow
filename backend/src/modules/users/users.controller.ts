import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { UserRole } from './enums/user-role.enum';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { GetUsersQueryDto } from './dto/get-users-query.dto';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'List active technicians (supervisor, admin)' })
  @Get('technicians')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  findTechnicians() {
    return this.usersService.findActiveTechnicians();
  }

  @ApiOperation({ summary: 'List users (admin)' })
  @Get()
  @Roles(UserRole.ADMIN)
  findAll(@Query() query: GetUsersQueryDto) {
    return this.usersService.findAll(query);
  }

  @ApiOperation({ summary: 'Create a technician or supervisor (admin)' })
  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.createByAdmin(dto);
  }
}
