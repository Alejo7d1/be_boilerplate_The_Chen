import { BadRequestException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@PrismaClient";
import { RoutinesService } from "./routines.service.js";
import type { RoutineRepository } from "../repositories/index.js";

describe("H9. Plan de entrenamiento personalizado", () => {
  let service: RoutinesService;
  let repoMock: {
    findMember: ReturnType<typeof vi.fn>;
    createOrReplace: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repoMock = {
      findMember: vi.fn(),
      createOrReplace: vi.fn(),
    };
    service = new RoutinesService(repoMock as unknown as RoutineRepository);
  });

  it("crea o reemplaza una rutina para un usuario con rol MIEMBRO", async () => {
    const updatedAt = new Date("2026-11-22T15:00:00.000Z");
    repoMock.findMember.mockResolvedValue({ id: "member-1", role: UserRole.MIEMBRO });
    repoMock.createOrReplace.mockResolvedValue({
      id: "routine-1",
      memberId: "member-1",
      updatedAt,
    });

    const exercises = [{ name: "Sentadilla", sets: 4, reps: 10 }] as never;
    const res = await service.createOrReplace({ memberId: "member-1", exercises }, "trainer-1");

    expect(repoMock.createOrReplace).toHaveBeenCalledWith("member-1", "trainer-1", exercises);
    expect(res).toEqual({
      routineId: "routine-1",
      memberId: "member-1",
      updatedAt: updatedAt.toISOString(),
    });
  });

  it("lanza NotFoundException si el miembro no existe", async () => {
    repoMock.findMember.mockResolvedValue(null);

    await expect(
      service.createOrReplace({ memberId: "missing-member", exercises: [] as never }, "trainer-1"),
    ).rejects.toThrow(NotFoundException);
    expect(repoMock.createOrReplace).not.toHaveBeenCalled();
  });

  it("lanza BadRequestException si el usuario indicado no tiene rol MIEMBRO", async () => {
    repoMock.findMember.mockResolvedValue({ id: "user-2", role: UserRole.ENTRENADOR });

    await expect(
      service.createOrReplace({ memberId: "user-2", exercises: [] as never }, "trainer-1"),
    ).rejects.toThrow(BadRequestException);
    expect(repoMock.createOrReplace).not.toHaveBeenCalled();
  });
});
