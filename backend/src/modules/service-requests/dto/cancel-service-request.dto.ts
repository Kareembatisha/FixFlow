import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CancelServiceRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason!: string;
}
