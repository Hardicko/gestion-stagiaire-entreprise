import { PartialType } from '@nestjs/swagger';
import { CreateSupervisorDto } from './create-supervisor.dto';

export class UpdateSupervisorDto extends PartialType(CreateSupervisorDto) {}
