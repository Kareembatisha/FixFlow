import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ServiceRequest } from '../../service-requests/entities/service-request.entity';
import { User } from '../../users/entities/user.entity';

@Entity('work_orders')
export class WorkOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => ServiceRequest, { nullable: false })
  @JoinColumn({ name: 'serviceRequestId' })
  serviceRequest!: ServiceRequest;

  @Column({ type: 'uuid' })
  serviceRequestId!: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'technicianId' })
  technician!: User;

  @Column({ type: 'uuid' })
  technicianId!: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'assignedById' })
  assignedBy!: User;

  @Column({ type: 'uuid' })
  assignedById!: string;

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  startedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  submittedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  summary!: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approvedById' })
  approvedBy!: User | null;

  @Column({ type: 'uuid', nullable: true })
  approvedById!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
