import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { AuditAction, AuditOutcome } from '../../generated/prisma/enums';

export class AuditLogQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La page doit être un entier.' })
  @Min(1, { message: 'La page doit être supérieure ou égale à 1.' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La limite doit être un entier.' })
  @Min(1, { message: 'La limite doit être supérieure ou égale à 1.' })
  @Max(100, { message: 'La limite ne peut pas dépasser 100.' })
  limit?: number = 20;

  @IsOptional()
  @IsEnum(AuditAction, { message: "L'action d'audit est invalide." })
  action?: AuditAction;

  @IsOptional()
  @IsEnum(AuditOutcome, { message: "Le résultat d'audit est invalide." })
  outcome?: AuditOutcome;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  resource?: string;

  @IsOptional()
  @IsUUID('4', { message: "L'identifiant utilisateur doit être un UUID." })
  userId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La date de début est invalide.' })
  dateFrom?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La date de fin est invalide.' })
  dateTo?: string;
}
