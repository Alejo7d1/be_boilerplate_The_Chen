import { formatStrengthMark, parseStrengthMark } from './strength-mark.js';

describe('strength marks', () => {
  it('separa nombre, peso y repeticiones del texto libre', () => {
    expect(parseStrengthMark('Press banca 80 kg')).toEqual({
      exerciseName: 'Press banca',
      weightLifted: 80,
      repetitions: 1,
    });

    expect(parseStrengthMark('Sentadilla 100,5 kg x 8')).toEqual({
      exerciseName: 'Sentadilla',
      weightLifted: 100.5,
      repetitions: 8,
    });
  });

  it('conserva las marcas que no siguen el formato, sin peso', () => {
    expect(parseStrengthMark('  Dominadas  ')).toEqual({
      exerciseName: 'Dominadas',
      weightLifted: 0,
      repetitions: 1,
    });
  });

  it('acota el peso al rango de la columna', () => {
    expect(parseStrengthMark('Peso muerto 999 kg x 3').weightLifted).toBe(999);
  });

  it('formatea de vuelta al contrato del frontend', () => {
    expect(
      formatStrengthMark({
        exerciseName: 'Press banca',
        weightLifted: 72.5,
        repetitions: 6,
      }),
    ).toBe('Press banca 72.5 kg x 6');

    expect(
      formatStrengthMark({
        exerciseName: 'Dominadas',
        weightLifted: 0,
        repetitions: 1,
      }),
    ).toBe('Dominadas');
  });
});
