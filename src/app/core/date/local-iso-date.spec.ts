import { localIsoDate, localIsoTomorrow } from './local-iso-date';

/**
 * El caso que importa es el de la tarde en UTC-5, que es donde
 * `toISOString().split('T')[0]` empieza a mentir. Todo lo demás es aritmética
 * de calendario que igual conviene fijar.
 */
describe('localIsoDate', () => {
  it('reports the LOCAL day, not the UTC one, after 19:00 in UTC-5', () => {
    // 27 de agosto, 21:34 en Ecuador. En UTC ya son las 02:34 del 28.
    const nocheEnQuito = new Date(2026, 7, 27, 21, 34, 0);

    expect(localIsoDate(nocheEnQuito)).toBe('2026-08-27');
    // La prueba de que la trampa es real: el método viejo da el día siguiente.
    expect(nocheEnQuito.toISOString().split('T')[0]).not.toBe('2026-08-27');
  });

  it('pads month and day to two digits', () => {
    expect(localIsoDate(new Date(2026, 0, 5, 9, 0))).toBe('2026-01-05');
  });

  it('rolls the month and the year on the last day', () => {
    expect(localIsoTomorrow(new Date(2026, 11, 31, 23, 0))).toBe('2027-01-01');
    expect(localIsoTomorrow(new Date(2026, 7, 31, 8, 0))).toBe('2026-09-01');
  });

  it('does not mutate the date it was given', () => {
    // `setDate` muta, así que `localIsoTomorrow` trabaja sobre una copia. Sin
    // eso, pedir "mañana" adelantaría un día la fecha del que llama.
    const original = new Date(2026, 7, 27, 10, 0);

    localIsoTomorrow(original);

    expect(localIsoDate(original)).toBe('2026-08-27');
  });
});
