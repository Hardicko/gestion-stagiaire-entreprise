import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { EducationLevel, Gender } from '../../generated/prisma/enums';

export class CreateInternDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  registrationCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  @IsDateString()
  dateOfBirth!: string;

  @IsEnum(Gender)
  gender!: Gender;

  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  school!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fieldOfStudy!: string;

  @IsEnum(EducationLevel)
  educationLevel!: EducationLevel;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  studyYear!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  emergencyContactPhone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
