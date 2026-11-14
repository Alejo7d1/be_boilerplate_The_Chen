import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
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
import { CurrentUser } from '@Auth/decorators';
import { ClassSessionResponseDto, ReserveResponseDto } from '../dto/index.js';
import { ClassSessionsService } from '../services/index.js';

// JwtAuthGuard es global: estos endpoints exigen token sin decorador extra.
@ApiTags('class-sessions')
@ApiBearerAuth()
@Controller('class-sessions')
export class ClassSessionsController {
  constructor(private readonly service: ClassSessionsService) {}

  @Get()
  @ApiOperation({
    summary: 'Clases programadas de los próximos 7 días',
    description:
      'Devuelve las sesiones en estado Programada con su cupo disponible. Cualquier usuario autenticado puede consultarlas.',
  })
  @ApiOkResponse({ type: ClassSessionResponseDto, isArray: true })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Token ausente o inválido',
  })
  list(): Promise<ClassSessionResponseDto[]> {
    return this.service.listUpcoming();
  }

  @Post(':id/reserve')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Reservar un cupo en una sesión de clase',
    description:
      'Valida la membresía del miembro autenticado y reserva un cupo de forma atómica. Si la clase está llena o ya existe una reserva activa responde 409.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la sesión de clase.',
    format: 'uuid',
  })
  @ApiCreatedResponse({ type: ReserveResponseDto })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Token ausente o inválido',
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Membresía vencida o ausente',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Clase inexistente',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Cupo agotado, clase no disponible o reserva ya existente',
  })
  reserve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ): Promise<ReserveResponseDto> {
    return this.service.reserve(id, user.id);
  }
}
