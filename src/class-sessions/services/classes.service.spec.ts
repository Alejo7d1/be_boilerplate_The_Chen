import { ConflictException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClassNotCancellableError } from "../errors/index.js";
import { ClassesService } from "./classes.service.js";

describe("ClassesService (H6)", () => {
  const sessions = { create: vi.fn(), findById: vi.fn(), update: vi.fn(), cancel: vi.fn(), assertTrainerExists: vi.fn(), hasOverlap: vi.fn() };
  const notifications = { notifyClassCancelled: vi.fn() };
  let service: ClassesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ClassesService(sessions as never, notifications as never);
  });

  it("H6: crea clase valida y bloquea solapamiento de horario del entrenador (409)", async () => {
    sessions.assertTrainerExists.mockResolvedValue(undefined);
    sessions.hasOverlap.mockResolvedValueOnce(false);
    sessions.create.mockResolvedValue({ id: "c1", name: "Yoga Flow", trainerId: "t1", trainerName: "Entrenador 1", startsAt: new Date("2027-01-15T08:00:00"), durationMin: 60, capacity: 20, activeCount: 0, status: "PROGRAMADA" });
    const created = await service.create({ name: "Yoga Flow", trainerId: "t1", date: "2027-01-15", startTime: "08:00", durationMinutes: 60, maxCapacity: 20 });
    expect(created.id).toBe("c1");
    sessions.hasOverlap.mockResolvedValueOnce(true);
    await expect(service.create({ name: "Spinning", trainerId: "t1", date: "2027-01-15", startTime: "08:30", durationMinutes: 60, maxCapacity: 15 })).rejects.toThrow(ConflictException);
  });

  it("H6: cancela clase enviando notificaciones y bloquea cancelar clase finalizada (409)", async () => {
    sessions.cancel.mockResolvedValueOnce({ session: { id: "c1", name: "Yoga Flow", trainerId: "t1", trainerName: "Entrenador 1", startsAt: new Date("2027-01-15T08:00:00"), durationMin: 60, capacity: 20, activeCount: 0, status: "CANCELADA" }, recipients: ["u1", "u2"] });
    const cancelled = await service.cancel("c1", "Mantenimiento");
    expect(cancelled.status).toBe("CANCELADA");
    expect(notifications.notifyClassCancelled).toHaveBeenCalledTimes(1);
    sessions.cancel.mockRejectedValueOnce(new ClassNotCancellableError());
    await expect(service.cancel("c-old", "Tarde")).rejects.toThrow(ConflictException);
  });
});
