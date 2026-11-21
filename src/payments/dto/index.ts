import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsUUID, Matches, Max, Min } from 'class-validator';

export class ProcessPaymentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  chargeId!: string;

  @ApiProperty({
    example: '4111111111111111',
    description: '16 dígitos, sin espacios.',
  })
  @Matches(/^\d{16}$/, { message: 'cardNumber debe tener exactamente 16 dígitos' })
  cardNumber!: string;

  @ApiProperty({ example: 12, minimum: 1, maximum: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  expMonth!: number;

  @ApiProperty({ example: 2027, description: 'Año de 4 dígitos.' })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  expYear!: number;

  @ApiProperty({ example: '123', description: '3 o 4 dígitos.' })
  @Matches(/^\d{3,4}$/, { message: 'cvv debe tener 3 o 4 dígitos' })
  cvv!: string;
}

export class PaymentReceiptResponseDto {
  @ApiProperty({ example: 'REC-00042' })
  receiptNumber!: string;

  @ApiProperty({ example: 150 })
  amount!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  paidAt!: string;

  @ApiProperty({ example: 'Renovación mensual' })
  concept!: string;

  @ApiProperty({ example: '1111' })
  last4!: string;

  @ApiProperty({ example: 'PAGADO' })
  status!: string;
}
