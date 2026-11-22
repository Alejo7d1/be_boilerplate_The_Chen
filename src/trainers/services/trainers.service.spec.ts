import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@PrismaClient";
import { TrainersService } from "./trainers.service.js";
import type { TrainerRepository } from "../repositories/index.js";

describe("H7. Registro de bloques de disponibilidad de entrenador", () => {
  let service: TrainersService;
  let repoMock: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    repoMock = {
      findTrainers: vi.fn(),
      findTrainerById: vi.fn(),
      findSlotsForDate: vi.fn().mockResolvedValue([]),
      createSlot: vi.fn(),
      findSlots: vi.fn().mockResolvedValue([]),
      findSlotById: vi.fn(),
      deleteSlot: vi.fn().mockResolvedValue(undefined),
    };
    service = new TrainersService(repoMock as unknown as TrainerRepository);
  });

  it("AC1: crea un bloque de 60 minutos en horario válido futuro", async () => {
    repoMock.createSlot.mockResolvedValue({
      id: "slot-1",
      trainerId: "trainer-1",
      date: new Date("2027-12-20T00:00:00.000Z"),
      startTime: "09:00",
      endTime: "10:00",
      isBooked: false,
    });
    const res = await service.createSlot("trainer-1", { date: "2027-12-20", startTime: "09:00" });
    expect(res).toMatchObject({ startTime: "09:00", endTime: "10:00" });
  });

  it("AC2: permite consultar disponibilidad propia y bloquea consultar la de otro entrenador", async () => {
    repoMock.findTrainerById.mockResolvedValue({ id: "trainer-1" });
    const own = await service.listAvailability({ id: "trainer-1", role: "ENTRENADOR" } as User, "trainer-1");
    expect(own.data).toEqual([]);
    await expect(service.listAvailability({ id: "trainer-2", role: "ENTRENADOR" } as User, "trainer-1")).rejects.toThrow(ForbiddenException);
  });

  it("AC3 (Negativo): rechaza bloques cruzados y fechas pasadas", async () => {
    repoMock.findSlotsForDate.mockResolvedValue([{ id: "s-1", trainerId: "trainer-1", date: new Date("2027-12-20T00:00:00.000Z"), startTime: "10:00", endTime: "11:00", isBooked: false }]);
    await expect(service.createSlot("trainer-1", { date: "2027-12-20", startTime: "10:30" })).rejects.toThrow(ConflictException);
    await expect(service.createSlot("trainer-1", { date: "2020-01-01", startTime: "10:00" })).rejects.toThrow(BadRequestException);
  });

  it("AC3 (Negativo): rechaza eliminar bloque inexistente o reservado", async () => {
    repoMock.findSlotById.mockResolvedValueOnce(null);
    await expect(service.deleteSlot("trainer-1", "missing")).rejects.toThrow(NotFoundException);
    repoMock.findSlotById.mockResolvedValueOnce({ id: "s-2", trainerId: "trainer-1", isBooked: true });
    await expect(service.deleteSlot("trainer-1", "s-2")).rejects.toThrow(ConflictException);
  });
});
