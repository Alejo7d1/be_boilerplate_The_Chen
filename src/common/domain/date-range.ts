/**
 * Fechas `YYYY-MM-DD` de los contratos HTTP (filtros y reportes).
 *
 * El frontend envía días sin hora, así que los rangos se interpretan en la
 * zona del servidor: el inicio es la medianoche local y el fin el último
 * milisegundo del día, de modo que un filtro `startDate=endDate=hoy` incluya
 * todo lo sucedido hoy.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  return ISO_DATE.test(value);
}

export function startOfDay(value: string): Date {
  const date = new Date(`${value}T00:00:00`);
  if (!isIsoDate(value) || Number.isNaN(date.getTime())) {
    throw new RangeError(`Fecha inválida: ${value}`);
  }
  return date;
}

export function endOfDay(value: string): Date {
  const date = new Date(`${value}T23:59:59.999`);
  if (!isIsoDate(value) || Number.isNaN(date.getTime())) {
    throw new RangeError(`Fecha inválida: ${value}`);
  }
  return date;
}

/** Día local en formato `YYYY-MM-DD`, tal como lo espera el frontend. */
export function toIsoDay(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
