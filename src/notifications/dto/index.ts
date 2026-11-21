import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { NotificationSource, type Notification } from '@PrismaClient';

export const NOTIFICATIONS_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

/** Topes de `notifications.title` y `notifications.message`. */
export const MAX_TITLE_LENGTH = 100;
export const MAX_MESSAGE_LENGTH = 500;
/** Un envío no puede abarcar a todo el padrón de golpe. */
export const MAX_RECIPIENTS = 50;

export class ListNotificationsQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Página, desde 1.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    example: NOTIFICATIONS_PAGE_SIZE,
    description: `Tamaño de página (por defecto ${NOTIFICATIONS_PAGE_SIZE}).`,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit?: number;
}

export class NotificationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Clase cancelada' })
  title!: string;

  @ApiProperty({ example: 'Yoga Flow del 20/11 a las 18:00 fue cancelada.' })
  message!: string;

  @ApiProperty({
    enum: ['MEMBRESIA', 'CLASES', 'PAGOS', 'EQUIPAMIENTO'],
    example: 'CLASES',
  })
  sourceModule!: string;

  @ApiProperty({ nullable: true, type: String })
  referenceId!: string | null;

  @ApiProperty({ example: false })
  isRead!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  static fromEntity(notification: Notification): NotificationResponseDto {
    return {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      sourceModule: notification.sourceModule,
      referenceId: notification.referenceId,
      isRead: notification.isRead,
      createdAt: notification.createdAt.toISOString(),
    };
  }
}

/** Bandeja paginada: `data` es la lista y `unreadCount` el total sin leer. */
export class NotificationListResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  data!: NotificationResponseDto[];

  @ApiProperty({ example: 3 })
  unreadCount!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: NOTIFICATIONS_PAGE_SIZE })
  pageSize!: number;

  @ApiProperty({ example: 24 })
  total!: number;
}

/**
 * Envío manual de una notificación (Módulo 9).
 *
 * Es un despacho: el backend crea una fila por destinatario, así que cada uno
 * la ve en su propia bandeja con su propio estado de lectura.
 */
export class SendNotificationDto {
  @ApiProperty({
    type: [String],
    format: 'uuid',
    example: ['9f0f5f8e-1f0e-4b0e-9c3f-1a2b3c4d5e6f'],
    description: `Destinatarios (1 a ${MAX_RECIPIENTS}). Se deduplican.`,
    minItems: 1,
    maxItems: MAX_RECIPIENTS,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_RECIPIENTS)
  @IsUUID('4', { each: true })
  recipientIds!: string[];

  @ApiProperty({ example: 'Membresía por vencer', maxLength: MAX_TITLE_LENGTH })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_TITLE_LENGTH)
  title!: string;

  @ApiProperty({
    example: 'Tu membresía vence en 3 días.',
    maxLength: MAX_MESSAGE_LENGTH,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_MESSAGE_LENGTH)
  message!: string;

  @ApiProperty({
    enum: NotificationSource,
    example: NotificationSource.MEMBRESIA,
    description: 'Módulo que origina el aviso.',
  })
  @IsEnum(NotificationSource)
  sourceModule!: NotificationSource;

  @ApiPropertyOptional({
    example: 'b3c2a1d0-0000-4000-8000-000000000001',
    description:
      'ID del recurso relacionado (clase, cobro, membresía…). Sirve para que el FE navegue desde la notificación.',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceId?: string;
}

export class SendNotificationResponseDto {
  @ApiProperty({ example: 2, description: 'Filas creadas (una por destinatario).' })
  sent!: number;

  @ApiProperty({
    type: [String],
    format: 'uuid',
    description: 'IDs de las notificaciones creadas.',
  })
  notificationIds!: string[];
}
