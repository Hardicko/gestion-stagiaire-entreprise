import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RoleModule } from './role/role.module';
import { UserModule } from './user/user.module';
import { DepartmentModule } from './department/department.module';
import { SupervisorModule } from './supervisor/supervisor.module';
import { AuthorityModule } from './authority/authority.module';
import { ProjectModule } from './project/project.module';
import { InternModule } from './intern/intern.module';
import { InternshipModule } from './internship/internship.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    RoleModule,
    UserModule,
    DepartmentModule,
    SupervisorModule,
    AuthorityModule,
    ProjectModule,
    InternModule,
    InternshipModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
