import { Module } from '@nestjs/common';
import { MembershipsModule } from '@Memberships';
import { AccessController } from './controllers/index.js';
import { AccessRepository } from './repositories/index.js';
import { AccessService } from './services/index.js';

@Module({
  imports: [MembershipsModule],
  controllers: [AccessController],
  providers: [AccessService, AccessRepository],
})
export class AccessModule {}
