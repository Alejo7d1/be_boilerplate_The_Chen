import type { PlanType } from '@PrismaClient';

export type MembershipStatus = 'Vigente' | 'Vencida' | 'Sin Membresía';

export interface MembershipSnapshot {
  id: string;
  planId: string;
  planName: string;
  planType: PlanType;
  startDate: Date;
  endDate: Date | null;
  remainingClasses: number | null;
}

/** Regla 1.5 del documento de historias, compartida por H1, H5 y H8. */
export function resolveMembershipStatus(
  membership: MembershipSnapshot | null,
): MembershipStatus {
  if (!membership) return 'Sin Membresía';
  if (membership.planType === 'CLASES_SUELTAS') {
    return (membership.remainingClasses ?? 0) > 0 ? 'Vigente' : 'Vencida';
  }
  if (!membership.endDate) return 'Vencida';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return membership.endDate >= today ? 'Vigente' : 'Vencida';
}

export function isMembershipActive(
  membership: MembershipSnapshot | null,
): boolean {
  return resolveMembershipStatus(membership) === 'Vigente';
}
