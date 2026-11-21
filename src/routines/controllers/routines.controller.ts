import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '@Common/dto';
import { CurrentUser, Roles } from '@Auth/decorators';
import { CreateRoutineDto, RoutineResponseDto } from '../dto/index.js';
import { RoutinesService } from '../services/index.js';
import type { User } from '@PrismaClient';

@ApiTags('routines')
@ApiBearerAuth()
@Controller('routines')
export class RoutinesController {
  constructor(private readonly service: RoutinesService) {}

  @Post()
  @Roles('ENTRENADOR')
  @ApiOperation({
    summary: 'Asigna o reemplaza la rutina de un miembro (H12)',
    description:
      'Cada miembro tiene una sola rutina activa. El entrenador autenticado queda registrado como autor y los ejercicios enviados reemplazan a los anteriores en una sola transacción.',
  })
  @ApiCreatedResponse({ type: RoutineResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Ejercicios fuera de rango o usuario que no es miembro',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Miembro inexistente',
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Rol distinto de ENTRENADOR',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Token ausente o inválido',
  })
  create(
    @Body() dto: CreateRoutineDto,
    @CurrentUser() user: User,
  ): Promise<RoutineResponseDto> {
    return this.service.createOrReplace(dto, user.id);
  }
}
