import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PositionController } from './position.controller';
import { PositionService } from './position.service';

@Module({
  imports: [AuthModule],
  controllers: [PositionController],
  providers: [PositionService],
})
export class PositionModule {}
