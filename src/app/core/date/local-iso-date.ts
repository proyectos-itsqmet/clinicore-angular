/**
 * `yyyy-MM-dd` en la zona horaria del NAVEGADOR. Nunca UTC.
 *
 * ## Por qué existe, y por qué en un solo lugar
 *
 * `new Date().toISOString().split('T')[0]` devuelve el día en **UTC**. En
 * Ecuador (UTC-5) eso significa que **desde las 19:00 el "hoy" que calcula ya
 * es el día siguiente**. Un paciente que entra a agendar a las 21:30 aprieta
 * "Hoy" y la aplicación le filtra el día de mañana, sin ningún error a la
 * vista: la lista simplemente muestra otra cosa.
 *
 * El backend trabaja con `LocalDate`, que es el día del calendario de la
 * clínica. El cliente tiene que hablar el mismo calendario o los dos extremos
 * discrepan durante las últimas cinco horas de cada día — justo el horario en
 * el que alguien agenda para el día siguiente.
 *
 * Este proyecto ya había encontrado el bug DOS veces y lo había arreglado dos
 * veces, cada una con su propia copia privada: una en
 * `waiting-room-display.ts` y otra en `turn-list.component.ts`, ambas con un
 * comentario explicando la misma trampa. Mientras tanto seguía intacto en la
 * página de agendamiento, en el detalle de especialidad, en el calendario y en
 * las plantillas de horario. Un arreglo que no se comparte no es un arreglo:
 * es una nota al pie que el próximo archivo no va a leer.
 *
 * ## Por qué no `Intl` ni una librería
 *
 * `getFullYear`/`getMonth`/`getDate` ya devuelven la fecha local. No hace falta
 * nada más, y cualquier cosa más grande introduce una zona horaria configurable
 * que es exactamente la pregunta que no queremos que nadie tenga que responder
 * en cada llamada.
 */
export function localIsoDate(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** El día siguiente, en el mismo calendario local. */
export function localIsoTomorrow(from: Date = new Date()): string {
  const tomorrow = new Date(from);
  // `setDate` con un valor fuera de rango rueda el mes y el año solo, así que
  // el 31 de diciembre no necesita un caso especial.
  tomorrow.setDate(tomorrow.getDate() + 1);
  return localIsoDate(tomorrow);
}
