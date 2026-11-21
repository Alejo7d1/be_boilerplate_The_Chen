import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
  EquipmentListResponseDto,
  EquipmentResponseDto,
  ListEquipmentQueryDto,
  UpdateEquipmentStatusDto,
} from '../dto/index.js';
import { EquipmentService } from '../services/index.js';
import type { User } from '@PrismaClient';

@ApiTags('equipment')
@ApiBearerAuth()
@Controller('equipment')
export class EquipmentController {
  constructor(private readonly service: EquipmentService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista las máquinas del gimnasio',
    description:
      'Devuelve el inventario ordenado por nombre, opcionalmente filtrado por estado (`Operativa`, `En Mantenimiento`, `Fuera de Servicio`).',
  })
  @ApiOkResponse({ type: EquipmentListResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Estado fuera del catálogo',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Token ausente o inválido',
  })
  list(
    @Query() query: ListEquipmentQueryDto,
  ): Promise<EquipmentListResponseDto> {
    return this.service.list(query.status);
  }

  @Patch(':id/status')
  @Roles('RECEPCION_ADMIN')
  @ApiOperation({
    summary: 'Cambia el estado de una máquina',
    description:
      'Exige motivo cuando el estado no es `Operativa` y lo limpia al volver a `Operativa`. Registra el cambio en la bitácora inmutable de estados.',
  })
  @ApiParam({ name: 'id', description: 'ID de la máquina.', format: 'uuid' })
  @ApiOkResponse({ type: EquipmentResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Estado inválido o motivo ausente',
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
    description: 'Máquina inexistente',
  })
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEquipmentStatusDto,
    @CurrentUser() user: User,
  ): Promise<EquipmentResponseDto> {
    return this.service.changeStatus(id, dto, user.id);
  }
}
