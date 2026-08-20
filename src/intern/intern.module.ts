import { Module } from '@nestjs/common';
import { InternService } from './intern.service';
import { InternController } from './intern.controller';

@Module({
  controllers: [InternController],
  providers: [InternService],
})
export class InternModule {}
