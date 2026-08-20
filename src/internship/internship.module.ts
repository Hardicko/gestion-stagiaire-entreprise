import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { InternshipController } from './internship.controller';
import { InternshipService } from './internship.service';

@Module({
  imports: [AuthModule],
  controllers: [InternshipController],
  providers: [InternshipService],
})
export class InternshipModule {}
