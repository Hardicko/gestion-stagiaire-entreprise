import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ResetUserPasswordDto {
  @IsString({
    message: 'Le nouveau mot de passe doit être une chaîne de caractères.',
  })
  @MinLength(15, {
    message: 'Le nouveau mot de passe doit contenir au moins 15 caractères.',
  })
  @MaxLength(128, {
    message: 'Le nouveau mot de passe ne doit pas dépasser 128 caractères.',
  })
  newPassword: string;

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
  confirmNewPassword: string;

  @IsOptional()
  @IsBoolean({ message: 'mustChangePassword doit être un booléen.' })
  mustChangePassword?: boolean;
}
