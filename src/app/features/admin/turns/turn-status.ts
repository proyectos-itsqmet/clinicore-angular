import type { TurnStatus } from '../../../core/models';
import type { PillTone } from '../../../shared/ui/atoms/pill/pill';

/**
 * La palabra y el color de cada estado de turno, en UN solo lugar.
 *
 * `TURN_WAITNG` está mal escrito y así se queda: es el valor guardado en la base
 * y en el enum del backend. Corregirlo es una migración de datos, no un rename,
 * y hacerlo de un solo lado rompe el mapeo en silencio.
 */
const LABELS: Readonly<Record<TurnStatus, string>> = {
  TURN_PENDING: 'Pendiente',
  TURN_WAITNG: 'En espera',
  TURN_IN_TREATMENT: 'En atención',
  TURN_TREATED: 'Atendido',
  TURN_CANCELLED: 'Cancelado',
};

const TONES: Readonly<Record<TurnStatus, PillTone>> = {
  TURN_PENDING: 'tint',
  TURN_WAITNG: 'gold',
  TURN_IN_TREATMENT: 'tint',
  TURN_TREATED: 'ok',
  TURN_CANCELLED: 'plain',
};

/** Un estado desconocido se muestra crudo, no se esconde. */
export function turnStatusLabel(status: TurnStatus): string {
  return LABELS[status] ?? status;
}

export function turnStatusTone(status: TurnStatus): PillTone {
  return TONES[status] ?? 'plain';
}

/**
 * Un turno ya atendido o ya cancelado no admite más transiciones — el backend
 * las rechaza con un 400. Deshabilitar los botones evita el viaje de ida y
 * vuelta, pero la pantalla igual maneja el error: dos operadores en dos
 * pestañas pueden cerrar el mismo turno.
 */
export function isTurnClosed(status: TurnStatus): boolean {
  return status === 'TURN_TREATED' || status === 'TURN_CANCELLED';
}
