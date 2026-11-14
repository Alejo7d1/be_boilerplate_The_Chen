import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
import { Roles } from '@Auth/decorators';
import {
  CancelClassDto,
  ClassInputDto,
  ClassSessionResponseDto,
} from '../dto/index.js';
import { ClassesService } from '../services/index.js';

@ApiTags('classes')
@ApiBearerAuth()
@Controller('classes')
export class ClassesController {
  constructor(private readonly service: ClassesService) {}

  @Post()
  @Roles('RECEPCION_ADMIN')
  @ApiOperation({
    summary: 'Programa una clase grupal',
    description:
      'Crea una sesión de clase con nombre, entrenador, fecha, hora, duración y cupo. Rechaza con 409 si el entrenador ya tiene otra clase en ese horario.',
  })
  @ApiCreatedResponse({ type: ClassSessionResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Datos de la clase inválidos',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Token ausente o inválido',
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Rol distinto de RECEPCION_ADMIN',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Entrenador inexistente',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Solapamiento de horario del entrenador',
  })
  create(@Body() dto: ClassInputDto): Promise<ClassSessionResponseDto> {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles('RECEPCION_ADMIN')
  @ApiOperation({
    summary: 'Edita una clase grupal',
    description:
      'Reemplaza los datos completos de la clase. Vuelve a validar entrenador y solapamiento de horario, excluyendo la propia clase.',
  })
  @ApiParam({ name: 'id', description: 'ID de la clase.', format: 'uuid' })
  @ApiOkResponse({ type: ClassSessionResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Datos de la clase inválidos',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Token ausente o inválido',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Clase o entrenador inexistente',
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Rol distinto de RECEPCION_ADMIN',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Solapamiento de horario del entrenador',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ClassInputDto,
  ): Promise<ClassSessionResponseDto> {
    return this.service.update(id, dto);
  }

  @Patch(':id/cancel')
  @Roles('RECEPCION_ADMIN')
  @ApiOperation({
    summary: 'Cancela una clase y libera sus reservas',
    description:
      'Cambia la clase a Cancelada, marca sus reservas activas como Canceladas e invoca al Servicio de Notificaciones (fire-and-forget). No se puede cancelar una clase finalizada o ya cancelada.',
  })
  @ApiParam({ name: 'id', description: 'ID de la clase.', format: 'uuid' })
  @ApiOkResponse({ type: ClassSessionResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Motivo ausente',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Token ausente o inválido',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Clase inexistente',
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Rol distinto de RECEPCION_ADMIN',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'La clase ya finalizó o fue cancelada',
  })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelClassDto,
  ): Promise<ClassSessionResponseDto> {
    return this.service.cancel(id, dto.reason);
  }
}
