import { ApiProperty } from '@nestjs/swagger';

/**
 * Forma estándar de error de Nest/ValidationPipe.
 *
 * Se documenta para que Swagger muestre el cuerpo real de los 400/401/403/404/409
 * en lugar de una respuesta vacía.
 */
export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({
    description: 'Mensaje o lista de mensajes de validación.',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'No es posible cancelar con menos de 2 horas de anticipación',
  })
  message!: string | string[];

  @ApiProperty({ example: 'Bad Request' })
  error!: string;
}
