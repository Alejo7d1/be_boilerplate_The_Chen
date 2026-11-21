import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '@Common/dto';
import { CurrentUser } from '@Auth/decorators';
import {
  ListNotificationsQueryDto,
  NotificationListResponseDto,
  NotificationResponseDto,
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
}
