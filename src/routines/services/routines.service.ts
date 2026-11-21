import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@PrismaClient';
import { RoutineResponseDto, type CreateRoutineDto } from '../dto/index.js';
import { RoutineRepository } from '../repositories/index.js';

@Injectable()
export class RoutinesService {
  constructor(private readonly routines: RoutineRepository) {}

  async createOrReplace(
    dto: CreateRoutineDto,
    trainerId: string,
  ): Promise<RoutineResponseDto> {
    const member = await this.routines.findMember(dto.memberId);
    if (!member) throw new NotFoundException('El miembro no existe');
    if (member.role !== UserRole.MIEMBRO) {
      throw new BadRequestException('El usuario indicado no es un miembro');
    }

    const routine = await this.routines.createOrReplace(
      dto.memberId,
      trainerId,
      dto.exercises,
    );

    return {
      routineId: routine.id,
      memberId: routine.memberId,
      updatedAt: routine.updatedAt.toISOString(),
    };
  }
}
