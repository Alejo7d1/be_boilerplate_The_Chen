/**
 * H13: el contrato con el frontend viaja como texto libre
 * (`"Press banca 80 kg"`), pero la base guarda nombre, peso y repeticiones por
 * separado. Este par de funciones hace el ida y vuelta.
 */

/** Largo de `strength_marks.exercise_name`. */
const MAX_NAME_LENGTH = 50;
const MAX_WEIGHT = 999.9;
const MAX_REPETITIONS = 999;

const MARK_PATTERN =
  /^(?<name>.+?)\s+(?<weight>\d{1,3}(?:[.,]\d{1,2})?)\s*kg(?:\s*[x×]\s*(?<reps>\d{1,3}))?$/i;

export interface ParsedStrengthMark {
  exerciseName: string;
  weightLifted: number;
  repetitions: number;
}

/**
 * Un texto que no sigue el formato se guarda como marca sin peso conocido: es
 * preferible registrarlo a rechazar todo el formulario de progreso.
 */
export function parseStrengthMark(raw: string): ParsedStrengthMark {
  const value = raw.trim();
  const groups = MARK_PATTERN.exec(value)?.groups;

  if (!groups) {
    return {
      exerciseName: value.slice(0, MAX_NAME_LENGTH),
      weightLifted: 0,
      repetitions: 1,
    };
  }

  const weight = Math.min(
    Number(groups.weight.replace(',', '.')),
    MAX_WEIGHT,
  );
  const reps = groups.reps
    ? Math.min(Number(groups.reps), MAX_REPETITIONS)
    : 1;

  return {
    exerciseName: groups.name.trim().slice(0, MAX_NAME_LENGTH),
    weightLifted: weight,
    repetitions: reps,
  };
}

export function formatStrengthMark(mark: {
  exerciseName: string;
  weightLifted: unknown;
  repetitions: number;
}): string {
  const weight = Number(mark.weightLifted);
  // Las marcas sin peso (por ejemplo "Dominadas") se guardan con 0: se
  // devuelven tal cual para no inventar un dato que el miembro no cargó.
  if (weight === 0) return mark.exerciseName;

  const base = `${mark.exerciseName} ${weight} kg`;
  return mark.repetitions > 1 ? `${base} x ${mark.repetitions}` : base;
}
