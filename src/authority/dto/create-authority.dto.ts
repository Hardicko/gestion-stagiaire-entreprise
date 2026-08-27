import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateAuthorityDto {
  @IsUUID(['1', '4'], {
    message: 'L’identifiant de l’employé doit être un UUID valide.',
  })
  employeeId!: string;

  @IsOptional()
  @IsUUID(['1', '4'], {
    message: 'L’identifiant du département doit être un UUID valide.',
  })
  departmentId?: string | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  signingTitle!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
