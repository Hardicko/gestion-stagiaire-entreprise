import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { InternController } from './intern.controller';
import { InternService } from './intern.service';

@Module({
  imports: [AuthModule],
  controllers: [InternController],
  providers: [InternService],
})
export class InternModule {}
