import { Module } from '@nestjs/common';
import { ChargesController } from './controllers/index.js';
import { ChargeRepository } from './repositories/index.js';
import { ChargesService } from './services/index.js';

@Module({
  controllers: [ChargesController],
  providers: [ChargesService, ChargeRepository],
})
export class ChargesModule {}
