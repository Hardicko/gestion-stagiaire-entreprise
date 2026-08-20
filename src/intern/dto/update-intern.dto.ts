import { PartialType } from '@nestjs/mapped-types';
import { CreateInternDto } from './create-intern.dto';

export class UpdateInternDto extends PartialType(CreateInternDto) {}
