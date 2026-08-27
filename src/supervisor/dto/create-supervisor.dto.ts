import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreateSupervisorDto {
  @IsUUID(['1', '4'], {
    message: 'L’identifiant de l’employé doit être un UUID valide.',
  })
  employeeId!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
