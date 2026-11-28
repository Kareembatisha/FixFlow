import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ServiceRequest } from '../service-requests/entities/service-request.entity';

import { StatusHistory } from './entities/status-history.entity';
import { WorkOrder } from './entities/work-order.entity';
import { StatusHistoryService } from './status-history.service';
import { WorkflowService } from './workflow.service';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceRequest, StatusHistory, WorkOrder])],
  providers: [WorkflowService, StatusHistoryService],
  exports: [WorkflowService, StatusHistoryService],
})
export class WorkflowModule {}
