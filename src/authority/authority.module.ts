import { Module } from '@nestjs/common';
import { AuthorityService } from './authority.service';
import { AuthorityController } from './authority.controller';

@Module({
  controllers: [AuthorityController],
  providers: [AuthorityService],
})
export class AuthorityModule {}
