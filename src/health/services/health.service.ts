import { Injectable } from '@nestjs/common';
import type { HealthResponseDto } from '../dto/index.js';

const SERVICE_NAME = 'si_be_boilerplate';

@Injectable()
export class HealthService {
  private readonly startedAt = Date.now();

  /**
   * Liveness: confirma que el proceso responde. A propósito no consulta la
   * base, así un reinicio de Postgres no hace ver caída a la API.
   */
  check(): HealthResponseDto {
    return {
      status: 'ok',
      service: SERVICE_NAME,
      uptime: Math.round((Date.now() - this.startedAt) / 1000),
      timestamp: new Date().toISOString(),
    };
  }
}
