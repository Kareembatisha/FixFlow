import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserRole } from '../users/enums/user-role.enum';
import { CreateServiceTypeDto } from './dto/create-service-type.dto';
import { UpdateServiceTypeDto } from './dto/update-service-type.dto';
import { ServiceType } from './entities/service-type.entity';

@Injectable()
export class ServiceTypesService {
  constructor(
    @InjectRepository(ServiceType)
    private readonly serviceTypesRepository: Repository<ServiceType>,
  ) {}

  async create(dto: CreateServiceTypeDto): Promise<ServiceType> {
    const serviceType = this.serviceTypesRepository.create(dto);

    return this.serviceTypesRepository.save(serviceType);
  }

  async findAll(userRole: UserRole): Promise<ServiceType[]> {
    if (userRole === UserRole.ADMIN) {
      return this.serviceTypesRepository.find({
        order: { createdAt: 'DESC' },
      });
    }

    return this.serviceTypesRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userRole: UserRole): Promise<ServiceType> {
    const serviceType = await this.serviceTypesRepository.findOne({
      where: {
        id,
        ...(userRole === UserRole.ADMIN ? {} : { isActive: true }),
      },
    });

    if (!serviceType) {
      throw new NotFoundException('Service type not found');
    }

    return serviceType;
  }

  async update(id: string, dto: UpdateServiceTypeDto): Promise<ServiceType> {
    const serviceType = await this.findOne(id, UserRole.ADMIN);

    this.serviceTypesRepository.merge(serviceType, dto);

    return this.serviceTypesRepository.save(serviceType);
  }

  async remove(id: string): Promise<ServiceType> {
    const serviceType = await this.findOne(id, UserRole.ADMIN);

    serviceType.isActive = false;

    return this.serviceTypesRepository.save(serviceType);
  }
}
