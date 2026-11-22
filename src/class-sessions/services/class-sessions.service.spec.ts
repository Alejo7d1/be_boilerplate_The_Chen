import { ConflictException, ForbiddenException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AlreadyReservedError, SessionFullError } from "../errors/index.js";
import { ClassSessionsService } from "./class-sessions.service.js";

describe("ClassSessionsService (H4)", () => {
  const sessions = { findUpcoming: vi.fn() };
  const reservations = { findLatestMembership: vi.fn(), reserveSpot: vi.fn() };
  let service: ClassSessionsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ClassSessionsService(sessions as never, reservations as never);
  });

  it("H4: lista clases de los siguientes 7 dias y reserva cupo con membresia vigente", async () => {
    sessions.findUpcoming.mockResolvedValue([]);
    expect(await service.listUpcoming()).toEqual([]);
    reservations.findLatestMembership.mockResolvedValue({ id: "m1", planType: "MENSUAL", endDate: new Date("2027-01-10T00:00:00.000Z"), remainingClasses: null });
    reservations.reserveSpot.mockResolvedValue({ id: "res-1" });
    const res = await service.reserve("cls-1", "mem-1");
    expect(res).toEqual({ reservationId: "res-1", status: "Activa", message: "Reserva confirmada" });
  });

  it("H4: rechaza reserva si membresia vencida, sobrecupo o ya reservada", async () => {
    reservations.findLatestMembership.mockResolvedValueOnce({ id: "m-exp", planType: "MENSUAL", endDate: new Date("2020-01-01T00:00:00.000Z"), remainingClasses: null });
    await expect(service.reserve("cls-1", "mem-exp")).rejects.toThrow(ForbiddenException);
    reservations.findLatestMembership.mockResolvedValue({ id: "m1", planType: "MENSUAL", endDate: new Date("2027-01-10T00:00:00.000Z"), remainingClasses: null });
    reservations.reserveSpot.mockRejectedValueOnce(new SessionFullError());
    await expect(service.reserve("cls-1", "mem-1")).rejects.toThrow(ConflictException);
    reservations.reserveSpot.mockRejectedValueOnce(new AlreadyReservedError());
    await expect(service.reserve("cls-1", "mem-1")).rejects.toThrow(ConflictException);
  });
});
