import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';
import { ServiceType } from '../../service-types/entities/service-type.entity';

import { Priority } from '../enums/priority.enum';
import { RequestStatus } from '../enums/request-status.enum';

@Entity('service_requests')
@Index(['status', 'createdAt'])
@Index(['customerId'])
@Index(['priority'])
export class ServiceRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  code!: string;

  // Customer relationship
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'customerId' })
  customer!: User;

  @Column({ type: 'uuid' })
  customerId!: string;

  // Service Type relationship
  @ManyToOne(() => ServiceType, { nullable: false })
  @JoinColumn({ name: 'serviceTypeId' })
  serviceType!: ServiceType;

  @Column({ type: 'uuid' })
  serviceTypeId!: string;

  @Column({ type: 'varchar', length: 150 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 255 })
  address!: string;

  @Column({ type: 'varchar', length: 20 })
  contactPhone!: string;

  @Column({
    type: 'enum',
    enum: Priority,
    default: Priority.MEDIUM,
  })
  priority!: Priority;

  @Column({
    type: 'enum',
    enum: RequestStatus,
    default: RequestStatus.NEW,
  })
  status!: RequestStatus;

  @Column({ type: 'timestamp', nullable: true })
  preferredDate!: Date | null;

  // Reviewer relationship
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewedById' })
  reviewedBy!: User | null;

  @Column({ type: 'uuid', nullable: true })
  reviewedById!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  cancelReason!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
