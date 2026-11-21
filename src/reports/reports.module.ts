import { Module } from '@nestjs/common';
import { ReportsController } from './controllers/index.js';
import { ReportRepository } from './repositories/index.js';
import { ReportsService } from './services/index.js';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ReportRepository],
})
export class ReportsModule {}
