import { BadRequestException, Injectable } from '@nestjs/common';
import { toIsoDay } from '@Common/domain';
import {
  CreateProgressResponseDto,
  ProgressListResponseDto,
  ProgressRecordResponseDto,
  type CreateProgressDto,
} from '../dto/index.js';
import { formatStrengthMark, parseStrengthMark } from '../domain/index.js';
import {
  ProgressRepository,
  type ProgressRecordWithMarks,
} from '../repositories/index.js';

@Injectable()
export class ProgressService {
  constructor(private readonly progress: ProgressRepository) {}

  async list(memberId: string): Promise<ProgressListResponseDto> {
    const rows = await this.progress.findByMember(memberId);
    return { data: rows.map((row) => this.toResponse(row)) };
  }

  async create(
    dto: CreateProgressDto,
    memberId: string,
  ): Promise<CreateProgressResponseDto> {
    const date = this.parseDate(dto.date);

    const record = await this.progress.create({
      memberId,
      date,
      weight: dto.weight,
      waist: dto.waist,
      chest: dto.chest,
      strengthMarks: (dto.strengthMarks ?? []).map(parseStrengthMark),
    });

    return { progressId: record.id, memberId: record.memberId, date: dto.date };
  }

  /**
   * La columna es `DATE`, así que se guarda a medianoche UTC: usar la hora
   * local correría el día para servidores con zona positiva.
   */
  private parseDate(value: string): Date {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('La fecha no es válida');
    }
    if (value > toIsoDay(new Date())) {
      throw new BadRequestException('La fecha no puede ser futura');
    }
    return date;
  }

  private toResponse(row: ProgressRecordWithMarks): ProgressRecordResponseDto {
    return {
      progressId: row.id,
      memberId: row.memberId,
      date: row.date.toISOString().slice(0, 10),
      weight: Number(row.weight),
      waist: Number(row.waist),
      chest: Number(row.chest),
      strengthMarks: row.strengthMarks.map(formatStrengthMark),
    };
  }
}
