import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
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
  ListNotificationsQueryDto,
  NotificationListResponseDto,
  NotificationResponseDto,
  SendNotificationDto,
  SendNotificationResponseDto,
} from '../dto/index.js';
import { UserNotificationsService } from '../services/index.js';
import type { User } from '@PrismaClient';

// JwtAuthGuard es global: estos endpoints exigen token sin decorador extra.
@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: UserNotificationsService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Bandeja de notificaciones del usuario autenticado',
    description:
      'Devuelve la página solicitada (10 por defecto) ordenada de la más reciente a la más antigua, junto con el total sin leer.',
  })
  @ApiOkResponse({ type: NotificationListResponseDto })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Token ausente o inválido',
  })
  list(
    @CurrentUser() user: User,
    @Query() query: ListNotificationsQueryDto,
  ): Promise<NotificationListResponseDto> {
    return this.service.list(user.id, query.page, query.limit);
  }

  @Patch(':id/read')
  @ApiOperation({
    summary: 'Marca una notificación como leída',
    description:
      'Solo el destinatario puede marcarla; cualquier otro usuario recibe 404. Es idempotente.',
  })
  @ApiParam({ name: 'id', description: 'ID de la notificación.', format: 'uuid' })
  @ApiOkResponse({ type: NotificationResponseDto })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Token ausente o inválido',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Notificación inexistente o de otro usuario',
  })
  markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<NotificationResponseDto> {
    return this.service.markAsRead(id, user.id);
  }

  @Post('send')
  @Roles('RECEPCION_ADMIN', 'ENTRENADOR')
  @ApiOperation({
    summary: 'Envía una notificación a uno o varios usuarios (Módulo 9)',
    description:
      'Crea una fila por destinatario, así cada uno la ve en su propia bandeja con su estado de lectura independiente. Recepción puede notificar a cualquier usuario activo; un `ENTRENADOR` solo a los miembros con los que tiene vínculo (clase, sesión personal o rutina asignada).',
  })
  @ApiCreatedResponse({ type: SendNotificationResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Destinatarios vacíos, más de 50, texto fuera de rango o módulo inválido',
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'El entrenador intentó notificar a un miembro fuera de su alcance',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Algún destinatario no existe o está inactivo',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Token ausente o inválido',
  })
  send(
    @Body() dto: SendNotificationDto,
    @CurrentUser() user: User,
  ): Promise<SendNotificationResponseDto> {
    return this.service.send(dto, user);
  }
}
