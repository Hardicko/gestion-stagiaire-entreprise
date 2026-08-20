import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { AuthorityModule } from './authority/authority.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DepartmentModule } from './department/department.module';
import { EmployeeModule } from './employee/employee.module';
import { HealthModule } from './health/health.module';
import { InternModule } from './intern/intern.module';
import { InternshipModule } from './internship/internship.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectAssignmentModule } from './project-assignment/project-assignment.module';
import { ProjectModule } from './project/project.module';
import { RoleModule } from './role/role.module';
import { SupervisorModule } from './supervisor/supervisor.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PrismaModule,
    HealthModule,
    DepartmentModule,
    RoleModule,
    EmployeeModule,
    AuthModule,
    AuditModule,
    UserModule,
    InternModule,
    SupervisorModule,
    AuthorityModule,
    InternshipModule,
    ProjectModule,
    ProjectAssignmentModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
