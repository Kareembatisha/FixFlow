import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { StatusHistory } from './entities/status-history.entity';
import { RequestStatus } from '../service-requests/enums/request-status.enum';

@Injectable()
export class StatusHistoryService {
  constructor(
    @InjectRepository(StatusHistory)
    private readonly statusHistoryRepository: Repository<StatusHistory>,
  ) {}

  async findByEntity(
    entityType: string,
    entityId: string,
  ): Promise<StatusHistory[]> {
    return this.statusHistoryRepository
      .createQueryBuilder('history')
      .leftJoin('history.changedBy', 'changedBy')
      .addSelect(['changedBy.id', 'changedBy.fullName', 'changedBy.role'])
      .where('history.entityType = :entityType', { entityType })
      .andWhere('history.entityId = :entityId', { entityId })
      .orderBy('history.createdAt', 'DESC')
      .getMany();
  }

  async record(
    manager: EntityManager,
    data: {
      entityType: string;
      entityId: string;
      oldStatus: RequestStatus | null;
      newStatus: RequestStatus;
      changedById: string;
      reason: string | null;
    },
  ): Promise<StatusHistory> {
    return manager.save(StatusHistory, data);
  }
}
