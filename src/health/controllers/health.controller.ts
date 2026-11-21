import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@Auth/decorators';
import { HealthResponseDto } from '@Health/dto';
import { HealthService } from '@Health/services';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Health check',
    description:
      'Confirma que la API está levantada y devuelve su estado. No requiere token ni consulta la base.',
  })
  @ApiOkResponse({
    type: HealthResponseDto,
    description: 'Servicio disponible.',
  })
  check(): HealthResponseDto {
    return this.healthService.check();
  }
}
