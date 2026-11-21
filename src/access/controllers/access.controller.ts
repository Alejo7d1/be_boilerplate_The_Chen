import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
import { CheckInDto, CheckInResponseDto } from '../dto/index.js';
import { AccessService } from '../services/index.js';
import type { User } from '@PrismaClient';

@ApiTags('access')
@ApiBearerAuth()
@Controller('access')
export class AccessController {
  constructor(private readonly service: AccessService) {}

  @Post('check-in')
  @Roles('RECEPCION_ADMIN')
  @ApiOperation({
    summary: 'Registra el ingreso de un miembro (H9)',
    description:
      'Busca al miembro por carné exacto o nombre completo. Responde `Permitido` si la membresía está vigente; si está vencida responde 403 y la UI reintenta con `allowException: true`, que registra `Excepcion`. Un segundo ingreso dentro de los 5 minutos responde 409.',
  })
  @ApiCreatedResponse({ type: CheckInResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Falta el carné y el nombre',
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Membresía vencida sin autorización por excepción',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Carné o nombre no encontrado',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Ingreso duplicado dentro de los 5 minutos',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Token ausente o inválido',
  })
  checkIn(
    @Body() dto: CheckInDto,
    @CurrentUser() user: User,
  ): Promise<CheckInResponseDto> {
    return this.service.checkIn(dto, user.id);
  }
}
