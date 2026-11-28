import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { Priority } from '../enums/priority.enum';

export class ReviewServiceRequestDto {
  @IsEnum(Priority)
  priority!: Priority;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
