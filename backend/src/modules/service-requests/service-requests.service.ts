import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { ServiceRequest } from './entities/service-request.entity';
import { ServiceType } from '../service-types/entities/service-type.entity';
import { User } from '../users/entities/user.entity';

import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { RequestStatus } from './enums/request-status.enum';
import { Priority } from './enums/priority.enum';
import { UserRole } from '../users/enums/user-role.enum';
import { GetServiceRequestsQueryDto } from './dto/get-service-requests-query.dto';

@Injectable()
export class ServiceRequestsService {
  constructor(
    @InjectRepository(ServiceRequest)
    private readonly serviceRequestRepository: Repository<ServiceRequest>,

    @InjectRepository(ServiceType)
    private readonly serviceTypeRepository: Repository<ServiceType>,

    private readonly dataSource: DataSource,
  ) {}

  async create(
    dto: CreateServiceRequestDto,
    customer: User,
  ): Promise<ServiceRequest> {
    // 1. Make sure the selected service type exists and is active.
    const serviceType = await this.serviceTypeRepository.findOne({
      where: {
        id: dto.serviceTypeId,
        isActive: true,
      },
    });

    if (!serviceType) {
      throw new NotFoundException('Active service type not found');
    }

    // 2. Generate a unique request code using PostgreSQL sequence.
    const sequenceResult: Array<{ value: string }> = await this.dataSource
      .query(`
        SELECT nextval('public.service_request_code_seq') AS value
      `);

    const sequenceNumber = Number(sequenceResult[0].value);

    const code = `SR-${String(sequenceNumber).padStart(6, '0')}`;

    // 3. Prepare the new service request.
    const serviceRequest = this.serviceRequestRepository.create({
      code,
      customerId: customer.id,
      serviceTypeId: serviceType.id,

      title: dto.title,
      description: dto.description,
      address: dto.address,
      contactPhone: dto.contactPhone,

      preferredDate: dto.preferredDate ? new Date(dto.preferredDate) : null,

      priority: Priority.MEDIUM,
      status: RequestStatus.NEW,
    });

    // 4. Save and return the created request.
    return this.serviceRequestRepository.save(serviceRequest);
  }

  async findAll(query: GetServiceRequestsQueryDto, user: User) {
    const { page, limit, status, priority, search } = query;

    // 1. Calculate pagination offset.
    const skip = (page - 1) * limit;

    // 2. Technician visibility is unavailable until WorkOrder
    // assignment is implemented in a future sprint.
    if (user.role === UserRole.TECHNICIAN) {
      return {
        items: [],
        meta: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }

    // 3. Start building the query.
    const queryBuilder =
      this.serviceRequestRepository.createQueryBuilder('serviceRequest');

    // 4. Apply role-based visibility.
    if (user.role === UserRole.CUSTOMER) {
      queryBuilder.andWhere('serviceRequest.customerId = :customerId', {
        customerId: user.id,
      });
    } else if (
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.SUPERVISOR
    ) {
      throw new ForbiddenException(
        'You do not have permission to access service requests',
      );
    }

    // 5. Apply status filter.
    if (status) {
      queryBuilder.andWhere('serviceRequest.status = :status', { status });
    }

    // 6. Apply priority filter.
    if (priority) {
      queryBuilder.andWhere('serviceRequest.priority = :priority', {
        priority,
      });
    }

    // 7. Apply search on request code and title.
    if (search) {
      queryBuilder.andWhere(
        `(
        serviceRequest.code ILIKE :search
        OR serviceRequest.title ILIKE :search
      )`,
        { search: `%${search}%` },
      );
    }

    // 8. Apply sorting and pagination.
    queryBuilder
      .orderBy('serviceRequest.createdAt', 'DESC')
      .addOrderBy('serviceRequest.id', 'DESC')
      .skip(skip)
      .take(limit);

    // 9. Execute query and get total matching records.
    const [items, total] = await queryBuilder.getManyAndCount();

    // 10. Return paginated result.
    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, user: User): Promise<ServiceRequest> {
    const queryBuilder =
      this.serviceRequestRepository.createQueryBuilder('serviceRequest');

    queryBuilder.where('serviceRequest.id = :id', { id });

    // Customer can only access their own requests.
    if (user.role === UserRole.CUSTOMER) {
      queryBuilder.andWhere('serviceRequest.customerId = :customerId', {
        customerId: user.id,
      });
    }

    // Technicians need an assigned WorkOrder to access requests.
    else if (user.role === UserRole.TECHNICIAN) {
      throw new NotFoundException('Service request not found');
    }

    // Admin and Supervisor can access all requests.
    else if (
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.SUPERVISOR
    ) {
      throw new ForbiddenException(
        'You do not have permission to access service requests',
      );
    }

    const serviceRequest = await queryBuilder.getOne();

    if (!serviceRequest) {
      throw new NotFoundException('Service request not found');
    }

    return serviceRequest;
  }
}
