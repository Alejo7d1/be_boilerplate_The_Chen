import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '@Common/dto';
import { CurrentUser, Roles } from '@Auth/decorators';
import { CreateTrainerSlotDto, TrainerSlotResponseDto } from '../dto/index.js';
import { TrainersService } from '../services/index.js';
import type { User } from '@PrismaClient';

@ApiTags('trainer-availability')
@ApiBearerAuth()
@Controller('trainer-availability')
export class TrainerAvailabilityController {
  constructor(private readonly service: TrainersService) {}

  @Post()
  @Roles('ENTRENADOR')
  @ApiOperation({
    summary: 'Registra un bloque de disponibilidad de 60 minutos',
    description:
      'El trainerId sale del token, nunca del cuerpo. Solo se permiten horarios entre 06:00 y 21:00, fechas futuras y bloques que no se crucen con otro del mismo entrenador.',
  })
  @ApiCreatedResponse({ type: TrainerSlotResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Fecha pasada, formato o rango inválido',
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Rol distinto de ENTRENADOR',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Bloque duplicado o cruzado',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Token ausente o inválido',
  })
  create(
    @Body() dto: CreateTrainerSlotDto,
    @CurrentUser() user: User,
  ): Promise<TrainerSlotResponseDto> {
    return this.service.createSlot(user.id, dto);
  }

  @Delete(':id')
  @Roles('ENTRENADOR')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Elimina un bloque propio no reservado',
    description:
      'Un bloque de otro entrenador o inexistente responde 404. Si ya está reservado por una sesión personal responde 409 y se conserva.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del bloque de disponibilidad.',
    format: 'uuid',
  })
  @ApiNoContentResponse({ description: 'Bloque eliminado' })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Rol distinto de ENTRENADOR',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Bloque inexistente o de otro entrenador',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'El bloque ya está reservado',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Token ausente o inválido',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.service.deleteSlot(user.id, id);
  }
}
