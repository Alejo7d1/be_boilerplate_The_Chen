import { Module } from '@nestjs/common';
import { MembershipsModule } from '@Memberships';
import { ReviewsController } from './controllers/index.js';
import { ReviewRepository } from './repositories/index.js';
import { ReviewsService } from './services/index.js';

@Module({
  imports: [MembershipsModule],
  controllers: [ReviewsController],
  providers: [ReviewsService, ReviewRepository],
})
export class ReviewsModule {}
