import {
  Body,
  Controller,
  Get,
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
  PlanInputDto,
  PlanListResponseDto,
  PlanResponseDto,
  UpdatePlanStatusDto,
} from '../dto/index.js';
import { PlansService } from '../services/index.js';

@ApiTags('plans')
@ApiBearerAuth()
@Controller('plans')
export class PlansController {
  constructor(private readonly service: PlansService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista los planes de membresía',
    description:
      'Devuelve todos los planes (activos e inactivos) con los campos que consume el frontend: durationDays, classCount y active.',
  })
  @ApiOkResponse({ type: PlanListResponseDto })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Token ausente o inválido',
  })
  async list(): Promise<PlanListResponseDto> {
    return { data: await this.service.list() };
  }

  @Post()
  @Roles('RECEPCION_ADMIN')
  @ApiOperation({
    summary: 'Crea un plan de membresía',
    description:
      'Normaliza classesIncluded a classCount e infiere el tipo (MENSUAL, TRIMESTRAL o CLASES_SUELTAS) cuando no se envía.',
  })
  @ApiCreatedResponse({ type: PlanResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Nombre, precio, duración o clases inválidos',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Token ausente o inválido',
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Rol distinto de RECEPCION_ADMIN',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Ya existe un plan con ese nombre',
  })
  create(@Body() dto: PlanInputDto): Promise<PlanResponseDto> {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles('RECEPCION_ADMIN')
  @ApiOperation({
    summary: 'Edita un plan de membresía',
    description:
      'Reemplaza los datos editables del plan y valida que el nombre no se repita.',
  })
  @ApiParam({ name: 'id', description: 'ID del plan.', format: 'uuid' })
  @ApiOkResponse({ type: PlanResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Nombre, precio, duración o clases inválidos',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Token ausente o inválido',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Plan inexistente',
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Rol distinto de RECEPCION_ADMIN',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Ya existe un plan con ese nombre',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PlanInputDto,
  ): Promise<PlanResponseDto> {
    return this.service.update(id, dto);
  }

  @Patch(':id/status')
  @Roles('RECEPCION_ADMIN')
  @ApiOperation({
    summary: 'Activa o desactiva un plan',
    description:
      'Aplica el valor de active enviado en el cuerpo. Desactivar un plan con membresías vigentes responde 409.',
  })
  @ApiParam({ name: 'id', description: 'ID del plan.', format: 'uuid' })
  @ApiOkResponse({ type: PlanResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Cuerpo inválido',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Token ausente o inválido',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Plan inexistente',
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Rol distinto de RECEPCION_ADMIN',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'El plan tiene membresías vigentes y no puede desactivarse',
  })
  setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlanStatusDto,
  ): Promise<PlanResponseDto> {
    return this.service.setStatus(id, dto.active);
  }
}
