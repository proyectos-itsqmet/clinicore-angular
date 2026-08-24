/** Para que sirve un motivo de bloqueo. Coincide con el enum del backend. */
export type BlockReasonKind =
  'REASON_HOLIDAY' | 'REASON_VACATION' | 'REASON_PERMISSION' | 'REASON_OTHER';

/** Catalogo de motivos de bloqueo — `GET /api/block-reasons`. */
export interface BlockReason {
  id: number;
  name: string;
  kind: BlockReasonKind;
  active: boolean;
  createdAt?: string;
}

export interface BlockReasonCreate {
  name: string;
  kind: BlockReasonKind;
  active?: boolean;
}
