import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsUUID(['1', '4'], {
    message: "L'identifiant de l'employé doit être un UUID valide.",
  })
  employeeId: string;

  @IsUUID(['1', '4'], {
    message: "L'identifiant du rôle doit être un UUID valide.",
  })
  roleId: string;

  @IsString({ message: 'Le mot de passe doit être une chaîne de caractères.' })
  @MinLength(15, {
    message: 'Le mot de passe doit contenir au moins 15 caractères.',
  })
  @MaxLength(128, {
    message: 'Le mot de passe ne doit pas dépasser 128 caractères.',
  })
  password: string;

  @IsString({
    message:
      'La confirmation du mot de passe doit être une chaîne de caractères.',
  })
  @MinLength(15, {
    message: 'La confirmation doit contenir au moins 15 caractères.',
  })
  @MaxLength(128, {
    message: 'La confirmation ne doit pas dépasser 128 caractères.',
  })
  confirmPassword: string;

  @IsOptional()
  @IsBoolean({ message: 'mustChangePassword doit être un booléen.' })
  mustChangePassword?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'isActive doit être un booléen.' })
  isActive?: boolean;
}
