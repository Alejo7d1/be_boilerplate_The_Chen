import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import type { Notification } from '@PrismaClient';

export const NOTIFICATIONS_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

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
