import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DepartmentModule } from './department/department.module';
import { EmployeeModule } from './employee/employee.module';
import { HealthModule } from './health/health.module';
import { InternModule } from './intern/intern.module';
import { PrismaModule } from './prisma/prisma.module';
import { RoleModule } from './role/role.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PrismaModule,
    HealthModule,
    DepartmentModule,
    RoleModule,
    EmployeeModule,
    AuthModule,
    InternModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
