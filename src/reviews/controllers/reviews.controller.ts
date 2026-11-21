import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
  CreateReviewDto,
  CreateReviewResponseDto,
  ReviewAnalyticsQueryDto,
  ReviewAnalyticsResponseDto,
} from '../dto/index.js';
import { ReviewsService } from '../services/index.js';
import type { User } from '@PrismaClient';

@ApiTags('reviews')
@ApiBearerAuth()
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @Post()
  @Roles('MIEMBRO')
  @ApiOperation({
    summary: 'Califica una clase o sesión personal (H16)',
    description:
      'Solo se califica dentro de los 7 días posteriores a la actividad y una vez por miembro y sesión.',
  })
  @ApiCreatedResponse({ type: CreateReviewResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Calificación o comentario inválidos',
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Membresía vencida o rol incorrecto',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Sesión inexistente o de otro miembro',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Sesión no finalizada, fuera del plazo o ya calificada',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Token ausente o inválido',
  })
  create(
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: User,
  ): Promise<CreateReviewResponseDto> {
    return this.service.create(dto, user.id);
  }

  @Get('analytics')
  @Roles('RECEPCION_ADMIN')
  @ApiOperation({
    summary: 'Promedio de reseñas por entrenador y por clase (H17)',
    description:
      'Agrupa las reseñas del rango por entrenador y, para las clases, por sesión. `average` es `null` cuando no hay reseñas.',
  })
  @ApiOkResponse({ type: ReviewAnalyticsResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Fechas ausentes, inválidas o rango invertido',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Token ausente o inválido',
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Rol distinto de RECEPCION_ADMIN',
  })
  analytics(
    @Query() query: ReviewAnalyticsQueryDto,
  ): Promise<ReviewAnalyticsResponseDto> {
    return this.service.analytics(query);
  }
}
