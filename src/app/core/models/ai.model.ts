import type { Encounter } from './encounter.model';
import type { Prescription } from './prescription.model';

/**
 * Respuesta de `POST /api/patients/{patientId}/clinical-summary`.
 * Refleja `ClinicalSummaryDTO` (Backend_QMS) exactamente.
 *
 * Trae `encuentros` y `recetas` junto al texto A PROPOSITO: son los registros
 * con los que se genero el resumen, para que el medico pueda verificar. Es el
 * mecanismo que cumple el requisito "que no invente nada" — no se le pide al
 * modelo que no alucine y se confia, se le pone la fuente al lado. La pantalla
 * NO debe mostrar el resumen sin ofrecer esos registros.
 *
 * `totalEncuentros` vs `encuentrosResumidos`: si el segundo es menor, el
 * resumen esta truncado por el tope del servidor (`ai.summary.max-encounters`)
 * y la pantalla tiene que decirlo. Un resumen truncado en silencio se lee como
 * completo.
 */
export interface ClinicalSummary {
  resumen: string;
  encuentros: Encounter[];
  recetas: Prescription[];
  totalEncuentros: number;
  encuentrosResumidos: number;
}

/**
 * Cuerpo de `POST /api/ai/chat` — el chat de atencion al cliente.
 *
 * `sessionId` lo genera el navegador (un UUID por pestania) y agrupa los
 * mensajes de una misma conversacion en la memoria del agente. NO es una
 * credencial: el endpoint es publico y anonimo a proposito, y el bot nunca
 * responde datos de un paciente concreto.
 */
export interface ChatRequest {
  sessionId: string;
  mensaje: string;
}

/** Respuesta de `POST /api/ai/chat`. Solo texto: el bot informa, no actua. */
export interface ChatResponse {
  respuesta: string;
}
