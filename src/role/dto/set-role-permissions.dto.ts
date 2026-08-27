import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class SetRolePermissionsDto {
  @ApiProperty({
    type: [String],
    description: 'Identifiants UUID des permissions à attribuer au rôle.',
  })
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  permissionIds!: string[];
}
