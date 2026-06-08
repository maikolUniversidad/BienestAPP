import { IsEnum, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { EmergencyType } from '@prisma/client';

export class SosDto {
  @IsEnum(EmergencyType)
  type: EmergencyType;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
