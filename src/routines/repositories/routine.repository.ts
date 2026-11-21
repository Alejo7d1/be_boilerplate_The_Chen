import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import type { Routine, UserRole } from '@PrismaClient';

export interface RoutineExerciseInput {
  name: string;
  series: number;
  reps: number;
}

export interface RoutineMember {
  id: string;
  role: UserRole;
}

@Injectable()
export class RoutineRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMember(memberId: string): Promise<RoutineMember | null> {
    return this.prisma.user.findUnique({
      where: { id: memberId },
      select: { id: true, role: true },
    });
  }

  /**
   * H12: una sola rutina activa por miembro. El POST reemplaza los ejercicios
   * completos en una transacción, así una rutina nunca queda a medio escribir.
   */
  createOrReplace(
    memberId: string,
    trainerId: string,
    exercises: RoutineExerciseInput[],
  ): Promise<Routine> {
    return this.prisma.$transaction(async (tx) => {
      const routine = await tx.routine.upsert({
        where: { memberId },
        update: { trainerId, isActive: true },
        create: { memberId, trainerId },
      });

      await tx.exercise.deleteMany({ where: { routineId: routine.id } });
      await tx.exercise.createMany({
        data: exercises.map((exercise, index) => ({
          routineId: routine.id,
          name: exercise.name.trim(),
          series: exercise.series,
          reps: exercise.reps,
          position: index,
        })),
      });

      return routine;
    });
  }
}
