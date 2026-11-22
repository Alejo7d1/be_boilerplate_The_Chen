import { ConflictException, NotFoundException } from "@nestjs/common";
import { PlanType } from "@PrismaClient";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlanNameTakenError } from "../errors/index.js";
import { PlansService } from "./plans.service.js";

describe("PlansService (H3)", () => {
  const repository = { findAll: vi.fn(), findById: vi.fn(), create: vi.fn(), update: vi.fn(), countCurrentMemberships: vi.fn(), setActive: vi.fn() };
  let service: PlansService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PlansService(repository as never);
  });

  it("H3: lista y crea planes normalizando campos", async () => {
    const basePlan = { id: "plan-1", name: "Paquete 10 Clases", type: PlanType.CLASES_SUELTAS, price: 45, durationDays: null, classCount: 10, benefits: "Acceso a clases grupales", active: true };
    repository.findAll.mockResolvedValue([basePlan]);
    repository.create.mockResolvedValue(basePlan);
    const listed = await service.list();
    expect(listed).toHaveLength(1);
    const created = await service.create({ name: "  Paquete 10 Clases  ", price: 45, classesIncluded: 10, benefits: "  Acceso a clases grupales  " });
    expect(created.id).toBe("plan-1");
  });

  it("H3: lanza ConflictException si el nombre del plan ya existe", async () => {
    repository.create.mockRejectedValue(new PlanNameTakenError());
    await expect(service.create({ name: "Mensual", price: 30, durationDays: 30 })).rejects.toThrow(ConflictException);
  });

  it("H3: impide desactivar plan con membresias vigentes (409)", async () => {
    repository.findById.mockResolvedValue({ id: "plan-1", active: true });
    repository.countCurrentMemberships.mockResolvedValue(3);
    await expect(service.setStatus("plan-1", false)).rejects.toThrow(ConflictException);
    expect(repository.setActive).not.toHaveBeenCalled();
  });

  it("H3: desactiva plan sin membresias vigentes y lanza NotFoundException si no existe", async () => {
    repository.findById.mockResolvedValueOnce(null);
    await expect(service.setStatus("inexistente", false)).rejects.toThrow(NotFoundException);
    repository.findById.mockResolvedValueOnce({ id: "plan-2", active: true });
    repository.countCurrentMemberships.mockResolvedValue(0);
    repository.setActive.mockResolvedValue({ id: "plan-2", name: "Plan Antiguo", type: PlanType.MENSUAL, price: 25, durationDays: 30, classCount: null, benefits: null, active: false });
    const updated = await service.setStatus("plan-2", false);
    expect(updated).toBeDefined();
    expect(repository.setActive).toHaveBeenCalledWith("plan-2", false);
  });
});
