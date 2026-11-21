import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import type { ProgressRecord } from '@PrismaClient';
import type { ParsedStrengthMark } from '../domain/index.js';

const RECORD_INCLUDE = {
  strengthMarks: { select: { exerciseName: true, weightLifted: true, repetitions: true } },
} as const;

export type ProgressRecordWithMarks = ProgressRecord & {
  strengthMarks: {
    exerciseName: string;
    weightLifted: unknown;
    repetitions: number;
  }[];
};

export interface CreateProgressInput {
  memberId: string;
  date: Date;
  weight: number;
  waist: number;
  chest: number;
  strengthMarks: ParsedStrengthMark[];
}

@Injectable()
export class ProgressRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** H13: solo el historial del miembro, del más reciente al más antiguo. */
  findByMember(memberId: string): Promise<ProgressRecordWithMarks[]> {
    return this.prisma.progressRecord.findMany({
      where: { memberId },
      orderBy: { date: 'desc' },
      include: RECORD_INCLUDE,
    });
  }

  create(input: CreateProgressInput): Promise<ProgressRecord> {
    return this.prisma.progressRecord.create({
      data: {
        memberId: input.memberId,
        date: input.date,
        weight: input.weight,
        waist: input.waist,
        chest: input.chest,
        strengthMarks: {
          create: input.strengthMarks.map((mark) => ({
            exerciseName: mark.exerciseName,
            weightLifted: mark.weightLifted,
            repetitions: mark.repetitions,
          })),
        },
      },
    });
  }
}
