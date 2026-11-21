import { Module } from '@nestjs/common';
import { MembershipsModule } from '@Memberships';
import { PersonalSessionsController } from './controllers/index.js';
import { PersonalSessionRepository } from './repositories/index.js';
import { PersonalSessionsService } from './services/index.js';

@Module({
  imports: [MembershipsModule],
  controllers: [PersonalSessionsController],
  providers: [PersonalSessionsService, PersonalSessionRepository],
})
export class PersonalSessionsModule {}
