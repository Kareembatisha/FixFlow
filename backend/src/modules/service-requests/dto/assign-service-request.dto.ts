import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class AssignServiceRequestDto {
  @IsUUID()
  technicianId!: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
