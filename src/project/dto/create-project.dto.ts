import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
} from 'class-validator';

import { ProjectStatus } from '../../generated/prisma/enums';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  projectCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
  })
  @MaxLength(500)
  gitlabLink?: string | null;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsUUID('4')
  departmentId!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
