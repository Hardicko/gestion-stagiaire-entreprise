import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { InternshipStatus, InternshipType } from '../../generated/prisma/enums';

export class CreateInternshipDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsEnum(InternshipStatus)
  status?: InternshipStatus;

  @IsEnum(InternshipType)
  internshipType!: InternshipType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monthlyAllowance?: number | null;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{3}$/, {
    message: 'La devise doit contenir exactement trois lettres.',
  })
  currency?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  workLocation!: string;

  @IsUUID(['1', '4'])
  internId!: string;

  @IsUUID(['1', '4'])
  departmentId!: string;

  @IsUUID(['1', '4'])
  supervisorId!: string;

  @IsOptional()
  @IsUUID(['1', '4'])
  authorityId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  grade?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
