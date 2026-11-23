import { BadRequestException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProgressService } from "./progress.service.js";

describe("ProgressService (H13)", () => {
  const repo = { findByMember: vi.fn(), create: vi.fn() };
  let service: ProgressService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ProgressService(repo as never);
  });

  it("H13: registra metricas corporales y marcas de fuerza en fecha valida y lista historial", async () => {
    repo.create.mockResolvedValue({ id: "prog-1", memberId: "mem-1" });
    const created = await service.create({ date: "2026-11-20", weight: 74.5, waist: 82, chest: 98, strengthMarks: ["Press Banca: 80kg x 8"] }, "mem-1");
    expect(created).toEqual({ progressId: "prog-1", memberId: "mem-1", date: "2026-11-20" });
    repo.findByMember.mockResolvedValue([{ id: "prog-1", memberId: "mem-1", date: new Date("2026-11-20T00:00:00.000Z"), weight: 74.5, waist: 82, chest: 98, strengthMarks: [] }]);
    const listed = await service.list("mem-1");
    expect(listed.data).toHaveLength(1);
    expect(listed.data[0].weight).toBe(74.5);
  });

  it("H13: rechaza fechas futuras o invalidas con BadRequestException (400)", async () => {
    await expect(service.create({ date: "2099-01-01", weight: 75, waist: 80, chest: 95 }, "mem-1")).rejects.toThrow(BadRequestException);
    await expect(service.create({ date: "fecha-invalida", weight: 75, waist: 80, chest: 95 }, "mem-1")).rejects.toThrow(BadRequestException);
    expect(repo.create).not.toHaveBeenCalled();
  });
});
