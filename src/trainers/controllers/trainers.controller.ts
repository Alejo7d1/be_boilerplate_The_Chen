import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiBearerAuth,
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
  TrainerListResponseDto,
  TrainerSlotListResponseDto,
} from '../dto/index.js';
import { TrainersService } from '../services/index.js';
import type { User } from '@PrismaClient';

@ApiTags('trainers')
@ApiBearerAuth()
@Controller('trainers')
export class TrainersController {
  constructor(private readonly service: TrainersService) {}

  @Get()
  @Roles('MIEMBRO', 'ENTRENADOR', 'RECEPCION_ADMIN')
  @ApiOperation({
    summary: 'Lista los entrenadores activos',
    description:
      'Devuelve id, email, rol, nombre y carné de los usuarios con rol ENTRENADOR. Alimenta el selector de agendamiento del frontend.',
  })
  @ApiOkResponse({ type: TrainerListResponseDto })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Token ausente o inválido',
  })
  async list(): Promise<TrainerListResponseDto> {
    return this.service.list();
  }

  @Get(':id/availability')
  @Roles('MIEMBRO', 'ENTRENADOR', 'RECEPCION_ADMIN')
  @ApiOperation({
    summary: 'Consulta los bloques de un entrenador',
    description:
      'Devuelve los bloques desde hoy con isBooked para que el frontend descarte los ocupados. Un ENTRENADOR solo puede consultar su propio id.',
  })
  @ApiParam({ name: 'id', description: 'ID del entrenador.', format: 'uuid' })
  @ApiOkResponse({ type: TrainerSlotListResponseDto })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Token ausente o inválido',
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Entrenador consultando a otro',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Entrenador inexistente',
  })
  availability(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<TrainerSlotListResponseDto> {
    return this.service.listAvailability(user, id);
  }
}
