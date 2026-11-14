import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@Auth/decorators';
import { HealthService } from '@Health/services';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Health check',
    description: 'Verifica que la API esté levantada. No requiere token.',
  })
  @ApiOkResponse({
    description: 'Servicio disponible.',
    schema: { type: 'string', example: 'Hello World!' },
  })
  getHello(): string {
    return this.healthService.getHello();
  }
}
