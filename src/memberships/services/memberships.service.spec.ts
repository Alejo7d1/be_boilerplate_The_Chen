import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { PlanType } from "@PrismaClient";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DuplicatePurchaseError, InactivePlanError, MemberNotFoundError, NotAMemberError, PlanNotFoundError } from "../errors/index.js";
import { MembershipsService } from "./memberships.service.js";

describe("MembershipsService (H1 / H2)", () => {
  const repository = { findLatestByUser: vi.fn(), purchase: vi.fn() };
  let service: MembershipsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MembershipsService(repository as never);
  });

  it("H1: devuelve estado Vigente, plan, vencimiento y clases restantes", async () => {
    repository.findLatestByUser.mockResolvedValue({
      id: "mem-1", planId: "plan-1", planName: "Plan Mensual", planType: PlanType.MENSUAL,
      startDate: new Date("2026-11-01T00:00:00.000Z"), endDate: new Date("2026-12-31T00:00:00.000Z"), remainingClasses: null,
    });
    const res = await service.findMine("user-1");
    expect(res.status).toBe("Vigente");
    expect(res.planName).toBe("Plan Mensual");
    expect(res.endDate).toBe("2026-12-31");
  });

  it("H1: devuelve Sin Membresia sin registro previo", async () => {
    repository.findLatestByUser.mockResolvedValue(null);
    const res = await service.findMine("user-sin-mem");
    expect(res.status).toBe("Sin Membresía");
    expect(res.planName).toBeNull();
  });

  it("H2: registra compra o renovacion y devuelve cobro y vigencia", async () => {
    repository.purchase.mockResolvedValue({ membership: { id: "mem-2", endDate: new Date("2026-12-22T00:00:00.000Z") }, charge: { id: "chg-1" } });
    const res = await service.purchase({ memberId: "user-1", planId: "plan-1" });
    expect(res).toEqual({ membershipId: "mem-2", chargeId: "chg-1", newEndDate: "2026-12-22", status: "Vigente" });
  });

  it("H2: traduce errores de dominio a excepciones HTTP", async () => {
    repository.purchase.mockRejectedValueOnce(new MemberNotFoundError());
    await expect(service.purchase({ memberId: "missing", planId: "plan-1" })).rejects.toThrow(NotFoundException);
    repository.purchase.mockRejectedValueOnce(new NotAMemberError());
    await expect(service.purchase({ memberId: "trainer-1", planId: "plan-1" })).rejects.toThrow(BadRequestException);
    repository.purchase.mockRejectedValueOnce(new PlanNotFoundError());
    await expect(service.purchase({ memberId: "user-1", planId: "missing" })).rejects.toThrow(NotFoundException);
    repository.purchase.mockRejectedValueOnce(new InactivePlanError());
    await expect(service.purchase({ memberId: "user-1", planId: "inactive" })).rejects.toThrow(BadRequestException);
    repository.purchase.mockRejectedValueOnce(new DuplicatePurchaseError());
    await expect(service.purchase({ memberId: "user-1", planId: "plan-1" })).rejects.toThrow(ConflictException);
  });
});
