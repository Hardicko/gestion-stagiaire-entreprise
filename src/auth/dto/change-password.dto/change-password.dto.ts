import {
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  currentPassword!: string;

  @IsString()
  @MinLength(15)
  @MaxLength(128)
  newPassword!: string;

  @IsString()
  @MinLength(15)
  @MaxLength(128)
  confirmNewPassword!: string;
}