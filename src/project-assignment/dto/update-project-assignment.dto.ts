import { PartialType } from '@nestjs/mapped-types';

import { CreateProjectAssignmentDto } from './create-project-assignment.dto';

export class UpdateProjectAssignmentDto extends PartialType(
  CreateProjectAssignmentDto,
) {}
