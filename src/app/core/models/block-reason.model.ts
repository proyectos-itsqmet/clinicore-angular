/**
 * Small catalog of reasons a `Schedule` slot was blocked, referenced by both
 * `Holiday` and `TimeOff`. Mirrors `BlockReasonDTO` (Backend_QMS) exactly:
 * that DTO has NO `createdAt` field even though the `BlockReason` entity
 * does — `BlockReasonService#mapToDTO` never sets it, so it is never present
 * on the wire. Do not add it here without re-checking that mapper first.
 */
export interface BlockReason {
  id: number;
  description: string;
}

export interface BlockReasonCreate {
  description: string;
}
