import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';

import { RequestStatus } from '../../service-requests/enums/request-status.enum';

@Entity('status_history')
@Index(['entityType', 'entityId'])
export class StatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  entityType!: string;

  @Column({ type: 'uuid' })
  entityId!: string;

  @Column({
    type: 'enum',
    enum: RequestStatus,
    nullable: true,
  })
  oldStatus!: RequestStatus | null;

  @Column({
    type: 'enum',
    enum: RequestStatus,
  })
  newStatus!: RequestStatus;

  // User who performed the status change
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'changedById' })
  changedBy!: User;

  @Column({ type: 'uuid' })
  changedById!: string;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
