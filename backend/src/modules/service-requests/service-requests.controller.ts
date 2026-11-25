import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ServiceRequestsService } from './service-requests.service';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { CurrentUser } from '../users/decorators/current-user.decorator';
import { GetServiceRequestsQueryDto } from './dto/get-service-requests-query.dto';

@ApiTags('Service Requests')
@ApiBearerAuth('access-token')
@Controller('service-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServiceRequestsController {
  constructor(
    private readonly serviceRequestsService: ServiceRequestsService,
  ) {}

  @ApiOperation({ summary: 'Create a service request (customer)' })
  @Post()
  @Roles(UserRole.CUSTOMER)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateServiceRequestDto, @CurrentUser() customer: User) {
    return this.serviceRequestsService.create(dto, customer);
  }

  @ApiOperation({ summary: 'Get service requests' })
  @Get()
  @Roles(
    UserRole.CUSTOMER,
    UserRole.TECHNICIAN,
    UserRole.SUPERVISOR,
    UserRole.ADMIN,
  )
  findAll(
    @Query() query: GetServiceRequestsQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.serviceRequestsService.findAll(query, user);
  }

  @ApiOperation({ summary: 'Get a service request by ID' })
  @Get(':id')
  @Roles(
    UserRole.CUSTOMER,
    UserRole.TECHNICIAN,
    UserRole.SUPERVISOR,
    UserRole.ADMIN,
  )
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.serviceRequestsService.findOne(id, user);
  }
}
