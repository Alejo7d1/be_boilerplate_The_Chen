import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '@Common/dto';
import { CurrentUser, Roles } from '@Auth/decorators';
import {
  CreateProgressDto,
  CreateProgressResponseDto,
  ProgressListResponseDto,
} from '../dto/index.js';
import { ProgressService } from '../services/index.js';
import type { User } from '@PrismaClient';

@ApiTags('progress')
@ApiBearerAuth()
@Controller('progress')
export class ProgressController {
  constructor(private readonly service: ProgressService) {}

  @Post()
  @Roles('MIEMBRO')
  @ApiOperation({
    summary: 'Registra el progreso físico del miembro (H13)',
    description:
      'Guarda peso, cintura, pecho y las marcas de fuerza del miembro autenticado. La fecha no puede ser futura.',
  })
  @ApiCreatedResponse({ type: CreateProgressResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Métricas fuera de rango o fecha futura',
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Rol distinto de MIEMBRO',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Token ausente o inválido',
  })
  create(
    @Body() dto: CreateProgressDto,
    @CurrentUser() user: User,
  ): Promise<CreateProgressResponseDto> {
    return this.service.create(dto, user.id);
  }

  @Get()
  @Roles('MIEMBRO')
  @ApiOperation({
    summary: 'Historial de progreso del miembro (H13)',
    description:
      'Devuelve solo los registros del miembro autenticado, del más reciente al más antiguo.',
  })
  @ApiOkResponse({ type: ProgressListResponseDto })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Rol distinto de MIEMBRO',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Token ausente o inválido',
  })
  list(@CurrentUser() user: User): Promise<ProgressListResponseDto> {
    return this.service.list(user.id);
  }
}
