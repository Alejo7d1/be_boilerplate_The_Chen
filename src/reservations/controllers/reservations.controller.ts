import { Controller, Delete, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '@Common/dto';
import { CurrentUser, Roles } from '@Auth/decorators';
import {
  CancelReservationResponseDto,
  ReservationListResponseDto,
} from '../dto/index.js';
import { ReservationsService } from '../services/index.js';
import type { User } from '@PrismaClient';

@ApiTags('reservations')
@ApiBearerAuth()
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly service: ReservationsService) {}

  @Get('me')
  @Roles('MIEMBRO')
  @ApiOperation({
    summary: 'Lista las reservas del miembro autenticado',
    description:
      'Devuelve las reservas propias (activas y canceladas) con el id de la reserva, los datos de la clase y cancelledAt cuando corresponde.',
  })
  @ApiOkResponse({ type: ReservationListResponseDto })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Token ausente o inválido',
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Rol distinto de MIEMBRO',
  })
  async findMine(
    @CurrentUser() user: User,
  ): Promise<ReservationListResponseDto> {
    return this.service.findMine(user.id);
  }

  @Delete(':id')
  @Roles('MIEMBRO')
  @ApiOperation({
    summary: 'Cancela una reserva propia',
    description:
      'Cancela la reserva y libera el cupo de forma atómica. Exige al menos 2 horas de anticipación. Una reserva ajena responde 404 para no revelar su existencia.',
  })
  @ApiParam({ name: 'id', description: 'ID de la reserva.', format: 'uuid' })
  @ApiOkResponse({ type: CancelReservationResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Faltan menos de 2 horas para el inicio de la clase',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Token ausente o inválido',
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Membresía vencida o rol incorrecto',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Reserva inexistente o de otro miembro',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'La reserva ya está cancelada',
  })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<CancelReservationResponseDto> {
    return this.service.cancel(id, user.id);
  }
}
