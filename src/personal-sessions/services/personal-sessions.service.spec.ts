import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isMembershipActive } from "@Memberships/domain";
import { SlotAlreadyBookedError, SlotNotFoundError } from "../errors/index.js";
import { PersonalSessionsService } from "./personal-sessions.service.js";
import type { PersonalSessionRepository } from "../repositories/index.js";
import type { MembershipRepository } from "@Memberships/repositories";

vi.mock("@Memberships/domain", () => ({
  isMembershipActive: vi.fn(),
}));

describe("H8. Agendamiento de sesión personal", () => {
  let service: PersonalSessionsService;
  let sessionsMock: { book: ReturnType<typeof vi.fn> };
  let membershipsMock: { findLatestByUser: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    sessionsMock = { book: vi.fn() };
    membershipsMock = { findLatestByUser: vi.fn() };
    service = new PersonalSessionsService(
      sessionsMock as unknown as PersonalSessionRepository,
      membershipsMock as unknown as MembershipRepository,
    );
  });

  it("AC1 & AC2: agenda una sesión en estado Agendada con cobro asociado si la membresía está activa", async () => {
    vi.mocked(isMembershipActive).mockReturnValue(true);
    membershipsMock.findLatestByUser.mockResolvedValue({ id: "mem-1", status: "Vigente" });
    sessionsMock.book.mockResolvedValue({
      session: { id: "sess-1", status: "Agendada" },
      charge: { id: "chg-1", status: "Pendiente" },
    });

    const res = await service.book("member-1", { trainerId: "tr-1", slotId: "slot-1" });

    expect(sessionsMock.book).toHaveBeenCalledWith("member-1", "tr-1", "slot-1");
    expect(res).toEqual({ sessionId: "sess-1", status: "Agendada", chargeId: "chg-1" });
  });

  it("AC3 (Negativo): rechaza con ForbiddenException si la membresía está vencida", async () => {
    vi.mocked(isMembershipActive).mockReturnValue(false);
    membershipsMock.findLatestByUser.mockResolvedValue({ id: "mem-old", status: "Vencida" });

    await expect(service.book("member-exp", { trainerId: "tr-1", slotId: "slot-1" })).rejects.toThrow(ForbiddenException);
    expect(sessionsMock.book).not.toHaveBeenCalled();
  });

  it("AC3 (Negativo): traduce SlotAlreadyBookedError a ConflictException y SlotNotFoundError a NotFoundException", async () => {
    vi.mocked(isMembershipActive).mockReturnValue(true);
    membershipsMock.findLatestByUser.mockResolvedValue({ id: "mem-1", status: "Vigente" });

    sessionsMock.book.mockRejectedValueOnce(new SlotAlreadyBookedError("slot-1"));
    await expect(service.book("member-2", { trainerId: "tr-1", slotId: "slot-1" })).rejects.toThrow(ConflictException);

    sessionsMock.book.mockRejectedValueOnce(new SlotNotFoundError("slot-404"));
    await expect(service.book("member-2", { trainerId: "tr-1", slotId: "slot-404" })).rejects.toThrow(NotFoundException);
  });
});
