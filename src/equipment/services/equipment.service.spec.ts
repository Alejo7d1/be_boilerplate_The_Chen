import { BadRequestException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EquipmentService } from "./equipment.service.js";

describe("EquipmentService (H14-H15)", () => {
  const equipment = { findAll: vi.fn(), updateStatus: vi.fn() };
  let service: EquipmentService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EquipmentService(equipment as never);
  });

  it("H15: lista maquinas disponibles y filtra por estado", async () => {
    equipment.findAll.mockResolvedValueOnce([{ id: "eq-1", name: "Cinta 1", category: "Cardio", status: "OPERATIVA", reason: null, updatedAt: new Date("2026-11-20T10:00:00.000Z") }]);
    const all = await service.list();
    expect(all.data).toHaveLength(1);
    equipment.findAll.mockResolvedValueOnce([]);
    const filtered = await service.list("En Mantenimiento");
    expect(filtered.data).toEqual([]);
  });

  it("H14: cambia estado exigiendo motivo cuando no es Operativa y limpia motivo al volver a Operativa", async () => {
    await expect(service.changeStatus("eq-1", { status: "En Mantenimiento", reason: "ok" } as never, "admin-1")).rejects.toThrow(BadRequestException);
    equipment.updateStatus.mockResolvedValueOnce({ id: "eq-1", name: "Cinta 1", category: "Cardio", status: "EN_MANTENIMIENTO", reason: "Falla en banda", updatedAt: new Date("2026-11-20T10:00:00.000Z") });
    const maint = await service.changeStatus("eq-1", { status: "En Mantenimiento", reason: "Falla en banda" } as never, "admin-1");
    expect(maint.status).toBe("En Mantenimiento");
    equipment.updateStatus.mockResolvedValueOnce({ id: "eq-1", name: "Cinta 1", category: "Cardio", status: "OPERATIVA", reason: null, updatedAt: new Date("2026-11-20T11:00:00.000Z") });
    const op = await service.changeStatus("eq-1", { status: "Operativa", reason: "" } as never, "admin-1");
    expect(op.status).toBe("Operativa");
    equipment.updateStatus.mockResolvedValueOnce(null);
    await expect(service.changeStatus("eq-404", { status: "Operativa" } as never, "admin-1")).rejects.toThrow(NotFoundException);
  });
});
