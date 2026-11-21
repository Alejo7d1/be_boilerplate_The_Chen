import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import {
  ChargeAlreadyPaidError,
  ChargeCancelledError,
  ChargeNotFoundError,
} from '../errors/index.js';
import {
  ChargeStatus,
  Prisma,
  type Charge,
  type Payment,
} from '@PrismaClient';

const CHARGE_WITH_PLAN = {
  plan: { select: { name: true } },
} as const;

export type PayableCharge = Charge & { plan: { name: string } | null };

export interface ProcessPaymentInput {
  chargeId: string;
  /** Dueño del cobro: evita que un miembro pague el cobro de otro. */
  memberId: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export interface ProcessedPayment {
  charge: PayableCharge;
  payment: Payment;
}

@Injectable()
export class PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Marca el cobro como pagado y emite el comprobante en una sola transacción.
   *
   * El advisory lock por cobro serializa dos intentos simultáneos sobre el
   * mismo registro (doble clic): el segundo ve el cobro ya pagado y responde
   * 409 en vez de emitir dos comprobantes.
   */
  async process(input: ProcessPaymentInput): Promise<ProcessedPayment> {
    const { chargeId, memberId, last4, expMonth, expYear } = input;

    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${chargeId}))`;

        const charge = await tx.charge.findUnique({
          where: { id: chargeId },
          include: CHARGE_WITH_PLAN,
        });
        // Un cobro ajeno responde 404 igual que uno inexistente: no se revela
        // la existencia de cobros de otros miembros.
        if (!charge || (charge.userId && charge.userId !== memberId)) {
          throw new ChargeNotFoundError(chargeId);
        }
        if (charge.status === ChargeStatus.Pagada) {
          throw new ChargeAlreadyPaidError(chargeId);
        }
        if (charge.status === ChargeStatus.Anulada) {
          throw new ChargeCancelledError(chargeId);
        }

        const paidAt = new Date();
        const receiptSeq = await this.nextReceiptSeq(tx);
        const receiptNumber = `REC-${String(receiptSeq).padStart(5, '0')}`;

        const payment = await tx.payment.create({
          data: {
            chargeId,
            receiptSeq,
            receiptNumber,
            amount: charge.amount,
            last4,
            expMonth,
            expYear,
            createdAt: paidAt,
          },
        });

        const updated = await tx.charge.update({
          where: { id: chargeId },
          data: {
            status: ChargeStatus.Pagada,
            receiptNumber,
            last4,
            paidAt,
          },
          include: CHARGE_WITH_PLAN,
        });

        return { charge: updated, payment };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  /** El comprobante es correlativo: lo emite la secuencia de la base. */
  private async nextReceiptSeq(
    tx: Prisma.TransactionClient,
  ): Promise<number> {
    const rows = await tx.$queryRaw<{ seq: number }[]>`
      SELECT nextval(pg_get_serial_sequence('payments', 'receipt_seq'))::int AS seq
    `;
    const seq = rows[0]?.seq;
    if (typeof seq !== 'number') {
      throw new Error('No se pudo generar el número de comprobante');
    }
    return seq;
  }
}
