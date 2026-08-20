import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ProjectAssignmentController } from './project-assignment.controller';
import { ProjectAssignmentService } from './project-assignment.service';

@Module({
  imports: [AuthModule],
  controllers: [ProjectAssignmentController],
  providers: [ProjectAssignmentService],
})
export class ProjectAssignmentModule {}
