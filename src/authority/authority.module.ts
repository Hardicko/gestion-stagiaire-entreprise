import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { AuthorityController } from './authority.controller';
import { AuthorityService } from './authority.service';

@Module({
  imports: [AuthModule],
  controllers: [AuthorityController],
  providers: [AuthorityService],
})
export class AuthorityModule {}
