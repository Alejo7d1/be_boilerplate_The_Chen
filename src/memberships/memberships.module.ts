import { Module } from '@nestjs/common';
import { MembershipsController } from './controllers/index.js';
import { MembershipRepository } from './repositories/index.js';
import { MembershipsService } from './services/index.js';

@Module({
  controllers: [MembershipsController],
  providers: [MembershipsService, MembershipRepository],
  exports: [MembershipRepository],
})
export class MembershipsModule {}
