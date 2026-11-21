import { ApiProperty } from '@nestjs/swagger';

/** Respuesta de liveness de `GET /api`. No consulta la base. */
export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: 'ok';

  @ApiProperty({ example: 'si_be_boilerplate' })
  service!: string;

  @ApiProperty({
    example: 4321,
    description: 'Segundos desde que arrancó el proceso.',
  })
  uptime!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  timestamp!: string;
}
