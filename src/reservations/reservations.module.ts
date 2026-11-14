import { Module } from '@nestjs/common';
import { MembershipsModule } from '@Memberships';
import { ReservationsController } from './controllers/index.js';
import { MemberReservationRepository } from './repositories/index.js';
import { ReservationsService } from './services/index.js';

@Module({
  imports: [MembershipsModule],
  controllers: [ReservationsController],
  providers: [ReservationsService, MemberReservationRepository],
})
export class ReservationsModule {}
