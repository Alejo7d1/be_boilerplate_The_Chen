import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '@Common/dto';
import { CurrentUser, Roles } from '@Auth/decorators';
import {
  CreatePersonalSessionDto,
  PersonalSessionResponseDto,
} from '../dto/index.js';
import { PersonalSessionsService } from '../services/index.js';
import type { User } from '@PrismaClient';

@ApiTags('personal-sessions')
@ApiBearerAuth()
@Controller('personal-sessions')
export class PersonalSessionsController {
  constructor(private readonly service: PersonalSessionsService) {}

  @Post()
  @Roles('MIEMBRO')
  @ApiOperation({
    summary: 'Agenda una sesión personal sobre un bloque libre',
    description:
      'Valida la membresía del miembro autenticado y reserva el bloque en una transacción serializable. Genera la sesión en estado Agendada y un cobro Pendiente. El bloque solo puede agendarse una vez.',
  })
  @ApiCreatedResponse({ type: PersonalSessionResponseDto })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Membresía vencida o rol incorrecto',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Entrenador o bloque inexistente',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'El bloque ya fue agendado',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Token ausente o inválido',
  })
  book(
    @Body() dto: CreatePersonalSessionDto,
    @CurrentUser() user: User,
  ): Promise<PersonalSessionResponseDto> {
    return this.service.book(user.id, dto);
  }
}
