import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ServiceRequestsService } from './service-requests.service';

import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { GetServiceRequestsQueryDto } from './dto/get-service-requests-query.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { CurrentUser } from '../users/decorators/current-user.decorator';
import { ReviewServiceRequestDto } from './dto/review-service-request.dto';
import { AssignServiceRequestDto } from './dto/assign-service-request.dto';
import { CancelServiceRequestDto } from './dto/cancel-service-request.dto';

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

  @ApiOperation({ summary: 'Get service request status history' })
  @Get(':id/history')
  @Roles(
    UserRole.CUSTOMER,
    UserRole.TECHNICIAN,
    UserRole.SUPERVISOR,
    UserRole.ADMIN,
  )
  findHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.serviceRequestsService.findHistory(id, user);
  }

  @ApiOperation({ summary: 'Review a service request' })
  @Patch(':id/review')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewServiceRequestDto,
    @CurrentUser() user: User,
  ) {
    return this.serviceRequestsService.review(id, dto, user);
  }

  @ApiOperation({ summary: 'Assign a service request to a technician' })
  @Post(':id/assign')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignServiceRequestDto,
    @CurrentUser() user: User,
  ) {
    return this.serviceRequestsService.assign(id, dto, user);
  }

  @ApiOperation({ summary: 'Cancel a service request' })
  @Patch(':id/cancel')
  @Roles(UserRole.CUSTOMER, UserRole.SUPERVISOR, UserRole.ADMIN)
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelServiceRequestDto,
    @CurrentUser() user: User,
  ) {
    return this.serviceRequestsService.cancel(id, dto.reason, user);
  }

  @ApiOperation({ summary: 'Reassign a service request to another technician' })
  @Patch(':id/reassign')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  reassign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignServiceRequestDto,
    @CurrentUser() user: User,
  ) {
    return this.serviceRequestsService.reassign(id, dto, user);
  }
}
