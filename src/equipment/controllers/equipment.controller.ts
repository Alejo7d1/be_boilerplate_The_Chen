import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@Auth/decorators';
import type { User } from '@PrismaClient';
import {
  MachineResponseDto,
  UpdateMachineStatusDto,
} from '@Equipment/dto';
import { EquipmentService } from '@Equipment/services';

@ApiTags('equipment')
@ApiBearerAuth()
@Controller('equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Get()
  @ApiOperation({ summary: 'Lista las máquinas ordenadas por nombre' })
  async list(): Promise<MachineResponseDto[]> {
    return this.equipmentService.list();
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Actualiza el estado de una máquina' })
  @ApiForbiddenResponse({ description: 'Solo administradores.' })
  @ApiNotFoundResponse({ description: 'La máquina no existe.' })
  async updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateMachineStatusDto,
    @CurrentUser() user: User,
  ): Promise<MachineResponseDto> {
    if (user.role !== 'ADMINISTRADOR') {
      throw new ForbiddenException('Solo un administrador puede cambiar estados.');
    }
    return this.equipmentService.updateStatus(id, dto, user.id);
  }
}
