import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '@Common/dto';
import { Roles } from '@Auth/decorators';
import {
  ListPendingChargesQueryDto,
  PendingChargesResponseDto,
} from '../dto/index.js';
import { ChargesService } from '../services/index.js';

@ApiTags('charges')
@ApiBearerAuth()
@Controller('charges')
export class ChargesController {
  constructor(private readonly service: ChargesService) {}

  @Get('pending')
  @Roles('RECEPCION_ADMIN')
  @ApiOperation({
    summary: 'Cobros pendientes (H11)',
    description:
      'Listado paginado de cobros en estado Pendiente, del más reciente al más antiguo. Acepta filtros por rango de fechas de emisión y por miembro.',
  })
  @ApiOkResponse({ type: PendingChargesResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Fechas inválidas o rango invertido',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Token ausente o inválido',
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Rol distinto de RECEPCION_ADMIN',
  })
  list(
    @Query() query: ListPendingChargesQueryDto,
  ): Promise<PendingChargesResponseDto> {
    return this.service.listPending(query);
  }
}
