import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@PrismaClient';
import { PaymentReceiptResponseDto, type ProcessPaymentDto } from '../dto/index.js';
import {
  ChargeAlreadyPaidError,
  ChargeCancelledError,
  ChargeNotFoundError,
} from '../errors/index.js';
import { PaymentRepository } from '../repositories/index.js';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@Injectable()
export class PaymentsService {
  constructor(private readonly payments: PaymentRepository) {}

  /**
   * H10: cobra un cobro Pendiente y emite el comprobante. Nunca se guarda el
   * número completo de la tarjeta ni el CVV: solo los últimos 4 dígitos.
   */
  async process(
    dto: ProcessPaymentDto,
    memberId: string,
  ): Promise<PaymentReceiptResponseDto> {
    try {
      const { charge, payment } = await this.payments.process({
        chargeId: dto.chargeId,
        memberId,
        last4: dto.cardNumber.slice(-4),
        expMonth: dto.expMonth,
        expYear: dto.expYear,
      });

      return {
        receiptNumber: payment.receiptNumber,
        amount: Number(payment.amount),
        paidAt: payment.createdAt.toISOString(),
        concept:
          charge.concept ??
          (charge.plan
            ? `Cobro de plan ${charge.plan.name}`
            : 'Pago de membresía'),
        last4: payment.last4,
        status: 'PAGADO',
      };
    } catch (error) {
      if (error instanceof ChargeNotFoundError) {
        throw new NotFoundException('El cobro no existe');
      }
      if (error instanceof ChargeAlreadyPaidError) {
        throw new ConflictException('El cobro ya fue pagado');
      }
      if (error instanceof ChargeCancelledError) {
        throw new ConflictException('El cobro fue anulado');
      }
      // Carrera entre dos pagos del mismo cobro: el índice único de
      // `payments.charge_id` decide y el segundo responde 409.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new ConflictException('El cobro ya fue pagado');
      }
      throw error;
    }
  }
}
