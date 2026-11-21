import { MachineStatus } from '@PrismaClient';

/**
 * Estados tal como viajan por HTTP (H14/H15). El enum de Prisma usa
 * SCREAMING_SNAKE (`EN_MANTENIMIENTO`), pero el contrato acordado con el
 * frontend usa literales con espacios, así que la traducción vive acá.
 */
export const EQUIPMENT_STATUSES = [
  'Operativa',
  'En Mantenimiento',
  'Fuera de Servicio',
] as const;

export type EquipmentStatus = (typeof EQUIPMENT_STATUSES)[number];

const LABELS: Record<MachineStatus, EquipmentStatus> = {
  [MachineStatus.OPERATIVA]: 'Operativa',
  [MachineStatus.EN_MANTENIMIENTO]: 'En Mantenimiento',
  [MachineStatus.FUERA_DE_SERVICIO]: 'Fuera de Servicio',
};

const MACHINE_STATUSES: Record<EquipmentStatus, MachineStatus> = {
  Operativa: MachineStatus.OPERATIVA,
  'En Mantenimiento': MachineStatus.EN_MANTENIMIENTO,
  'Fuera de Servicio': MachineStatus.FUERA_DE_SERVICIO,
};

export function toEquipmentStatus(status: MachineStatus): EquipmentStatus {
  return LABELS[status];
}

export function toMachineStatus(status: EquipmentStatus): MachineStatus {
  return MACHINE_STATUSES[status];
}
