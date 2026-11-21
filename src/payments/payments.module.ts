import { Module } from '@nestjs/common';
import { PaymentsController } from './controllers/index.js';
import { PaymentRepository } from './repositories/index.js';
import { PaymentsService } from './services/index.js';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentRepository],
})
export class PaymentsModule {}
