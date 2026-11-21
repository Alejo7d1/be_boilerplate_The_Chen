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
  FinancialReportQueryDto,
  FinancialReportResponseDto,
  OccupancyReportQueryDto,
  OccupancyReportResponseDto,
} from '../dto/index.js';
import { ReportsService } from '../services/index.js';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('occupancy')
  @Roles('RECEPCION_ADMIN')
  @ApiOperation({
    summary: 'Reporte de ocupación por clase (H20)',
    description:
      'Devuelve las sesiones del rango con cupo máximo, reservas activas, cupos libres y tasa de ocupación.',
  })
  @ApiOkResponse({ type: OccupancyReportResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Fechas ausentes, inválidas o rango invertido',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Token ausente o inválido',
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Rol distinto de RECEPCION_ADMIN',
  })
  occupancy(
    @Query() query: OccupancyReportQueryDto,
  ): Promise<OccupancyReportResponseDto> {
    return this.service.occupancy(query);
  }

  @Get('financial')
  @Roles('RECEPCION_ADMIN')
  @ApiOperation({
    summary: 'Reporte financiero del período (H21)',
    description:
      'Suma los cobros pagados del rango e informa cuántos pagos son renovaciones sobre membresías existentes.',
  })
  @ApiOkResponse({ type: FinancialReportResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Fechas ausentes, inválidas o rango invertido',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Token ausente o inválido',
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Rol distinto de RECEPCION_ADMIN',
  })
  financial(
    @Query() query: FinancialReportQueryDto,
  ): Promise<FinancialReportResponseDto> {
    return this.service.financial(query);
  }
}
