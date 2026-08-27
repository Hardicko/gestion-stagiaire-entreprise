import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

import { AssignmentStatus } from '../../generated/prisma/enums';

export class CreateProjectAssignmentDto {
  @IsUUID(['1', '4'])
  internshipId!: string;

  @IsUUID(['1', '4'])
  projectId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  role!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
