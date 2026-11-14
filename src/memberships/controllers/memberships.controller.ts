import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '@Common/dto';
import { CurrentUser, Roles } from '@Auth/decorators';
import {
  MembershipResponseDto,
  PurchaseMembershipDto,
  PurchaseMembershipResponseDto,
} from '../dto/index.js';
import { MembershipsService } from '../services/index.js';
import type { User } from '@PrismaClient';

@ApiTags('memberships')
@ApiBearerAuth()
@Controller('memberships')
export class MembershipsController {
  constructor(private readonly service: MembershipsService) {}

  @Get('me')
  @Roles('MIEMBRO')
  @ApiOperation({
    summary: 'Consulta la membresía del miembro autenticado',
    description:
      'Devuelve plan, estado (Vigente, Vencida o Sin Membresía), fecha de vencimiento y clases restantes. Sin membresía responde 200 con los campos en null.',
  })
  @ApiOkResponse({ type: MembershipResponseDto })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Token ausente o inválido',
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Rol distinto de MIEMBRO',
  })
  async findMine(@CurrentUser() user: User): Promise<MembershipResponseDto> {
    return this.service.findMine(user.id);
  }

  @Post('purchase')
  @Roles('RECEPCION_ADMIN')
  @ApiOperation({
    summary: 'Registra la compra o renovación de una membresía',
    description:
      'Compra o renueva en una transacción serializable. Si el miembro ya tiene una membresía vigente extiende newEndDate; además genera un cobro Pendiente. Un doble envío dentro de 5 segundos responde 409.',
  })
  @ApiCreatedResponse({ type: PurchaseMembershipResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Cuerpo inválido o plan inactivo',
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
    description: 'Miembro o plan inexistente',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Operación duplicada',
  })
  purchase(
    @Body() dto: PurchaseMembershipDto,
  ): Promise<PurchaseMembershipResponseDto> {
    return this.service.purchase(dto);
  }
}
