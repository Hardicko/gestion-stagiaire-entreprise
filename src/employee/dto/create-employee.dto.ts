import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  employeeNumber!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsUUID(['1', '4'], {
    message: 'Le poste sélectionné est invalide.',
  })
  positionId!: string;

  @IsUUID(['1', '4'], {
    message: 'Le département sélectionné est invalide.',
  })
  departmentId!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
