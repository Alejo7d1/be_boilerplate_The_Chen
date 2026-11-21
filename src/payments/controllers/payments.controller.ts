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
import {
  PaymentReceiptResponseDto,
  ProcessPaymentDto,
} from '../dto/index.js';
import { PaymentsService } from '../services/index.js';
import type { User } from '@PrismaClient';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Post('process')
  @Roles('MIEMBRO')
  @ApiOperation({
    summary: 'Paga un cobro pendiente (H10)',
    description:
      'Registra el pago y devuelve el comprobante correlativo `REC-XXXXX`. Solo se persisten los últimos 4 dígitos de la tarjeta; el CVV no se almacena ni se registra en logs.',
  })
  @ApiCreatedResponse({ type: PaymentReceiptResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Datos de tarjeta inválidos',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Cobro inexistente o de otro miembro',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'El cobro ya fue pagado o está anulado',
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Rol distinto de MIEMBRO',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Token ausente o inválido',
  })
  process(
    @Body() dto: ProcessPaymentDto,
    @CurrentUser() user: User,
  ): Promise<PaymentReceiptResponseDto> {
    return this.service.process(dto, user.id);
  }
}
