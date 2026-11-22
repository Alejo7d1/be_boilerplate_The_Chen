import { BadRequestException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CancellationWindowClosedError, ReservationNotFoundError } from "../errors/index.js";
import { ReservationsService } from "./reservations.service.js";

describe("ReservationsService (H5)", () => {
  const reservations = { findByMember: vi.fn(), cancel: vi.fn() };
  const memberships = { findLatestByUser: vi.fn() };
  let service: ReservationsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ReservationsService(reservations as never, memberships as never);
    memberships.findLatestByUser.mockResolvedValue({ id: "m1", planId: "p1", planName: "Mensual", planType: "MENSUAL", startDate: new Date("2026-11-01"), endDate: new Date("2027-01-10"), remainingClasses: null });
  });

  it("H5: consulta reservas activas y cancela con mas de 2 horas de anticipacion", async () => {
    reservations.findByMember.mockResolvedValue([]);
    expect(await service.findMine("mem-1")).toEqual({ data: [] });
    reservations.cancel.mockResolvedValue({ id: "res-1" });
    const res = await service.cancel("res-1", "mem-1");
    expect(res).toEqual({ reservationId: "res-1", status: "Cancelada", message: "Reserva cancelada exitosamente" });
  });

  it("H5: bloquea cancelar con menos de 2 horas (400) o reserva inexistente (404)", async () => {
    reservations.cancel.mockRejectedValueOnce(new CancellationWindowClosedError());
    await expect(service.cancel("res-2", "mem-1")).rejects.toThrow(BadRequestException);
    reservations.cancel.mockRejectedValueOnce(new ReservationNotFoundError());
    await expect(service.cancel("res-404", "mem-1")).rejects.toThrow(NotFoundException);
  });
});
