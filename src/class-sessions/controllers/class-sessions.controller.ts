import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  ApiBearerAuth, ApiConflictResponse, ApiCreatedResponse, ApiForbiddenResponse,
  ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@Auth/decorators';
import { ClassSessionResponseDto, ReserveResponseDto } from '../dto/index.js';
import { ClassSessionsService } from '../services/index.js';

// JwtAuthGuard es global: estos endpoints ya exigen Bearer sin decorador extra.
@ApiTags('class-sessions')
@ApiBearerAuth()
@Controller('class-sessions')
export class ClassSessionsController {
  constructor(private readonly service: ClassSessionsService) {}

  @Get()
  @ApiOperation({ summary: 'Clases programadas de los próximos 7 días' })
  @ApiOkResponse({ type: ClassSessionResponseDto, isArray: true })
  list(): Promise<ClassSessionResponseDto[]> {
    return this.service.listUpcoming();
  }

  @Post(':id/reserve')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Reservar un cupo en una sesión de clase' })
  @ApiCreatedResponse({ type: ReserveResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token ausente o inválido' })
  @ApiForbiddenResponse({ description: 'Membresía vencida' })
  @ApiConflictResponse({ description: 'Cupo agotado o reserva ya existente' })
  reserve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ): Promise<ReserveResponseDto> {
    return this.service.reserve(id, user.id);
  }
}
