import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsUUID(['1', '4'], {
    message: "L'identifiant du rôle doit être un UUID valide.",
  })
  roleId?: string;

  @IsOptional()
  @IsBoolean({ message: 'isActive doit être un booléen.' })
  isActive?: boolean;
}
