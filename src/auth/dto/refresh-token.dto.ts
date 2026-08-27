import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiPropertyOptional({
    description:
      'Refresh token utilisé uniquement quand le cookie HttpOnly est indisponible.',
    minLength: 64,
  })
  @IsOptional()
  @IsString()
  @MinLength(64)
  refreshToken?: string;
}
