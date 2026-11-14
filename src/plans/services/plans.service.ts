import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlanType } from '@PrismaClient';
import { PlanResponseDto, type PlanInputDto } from '../dto/index.js';
import { PlanNameTakenError } from '../errors/index.js';
import { PlanRepository, type PlanData } from '../repositories/index.js';

@Injectable()
export class PlansService {
  constructor(private readonly plans: PlanRepository) {}

  async list(): Promise<PlanResponseDto[]> {
    const rows = await this.plans.findAll();
    return rows.map((plan) => PlanResponseDto.fromEntity(plan));
  }

  async create(dto: PlanInputDto): Promise<PlanResponseDto> {
    try {
      const plan = await this.plans.create(this.toData(dto));
      return PlanResponseDto.fromEntity(plan);
    } catch (error) {
      this.translate(error);
      throw error;
    }
  }

  async update(id: string, dto: PlanInputDto): Promise<PlanResponseDto> {
    const existing = await this.plans.findById(id);
    if (!existing) throw new NotFoundException('El plan no existe');

    try {
      const plan = await this.plans.update(id, this.toData(dto));
      return PlanResponseDto.fromEntity(plan);
    } catch (error) {
      this.translate(error);
      throw error;
    }
  }

  async setStatus(id: string, active: boolean): Promise<PlanResponseDto> {
    const existing = await this.plans.findById(id);
    if (!existing) throw new NotFoundException('El plan no existe');

    if (!active) {
      const memberships = await this.plans.countCurrentMemberships(id);
      if (memberships > 0) {
        throw new ConflictException(
          'No se puede desactivar un plan con membresías vigentes',
        );
      }
    }

    const plan = await this.plans.setActive(id, active);
    return PlanResponseDto.fromEntity(plan);
  }

  private toData(dto: PlanInputDto): PlanData {
    return {
      name: dto.name.trim(),
      type: this.resolveType(dto),
      price: dto.price,
      durationDays: dto.durationDays ?? null,
      classCount: dto.classesIncluded ?? null,
      benefits: dto.benefits?.trim() || null,
    };
  }

  private resolveType(dto: PlanInputDto): PlanType {
    if (dto.type) return dto.type;
    if (dto.classesIncluded != null && dto.durationDays == null) {
      return PlanType.CLASES_SUELTAS;
    }
    if ((dto.durationDays ?? 0) >= 60) return PlanType.TRIMESTRAL;
    return PlanType.MENSUAL;
  }

  private translate(error: unknown): void {
    if (error instanceof PlanNameTakenError) {
      throw new ConflictException('Ya existe un plan con ese nombre');
    }
  }
}
