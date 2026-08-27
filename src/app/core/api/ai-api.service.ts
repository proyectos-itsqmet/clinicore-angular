import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { ClinicalSummary } from '../models';

/**
 * El resumen clinico para el medico (Bot 1). Pasa por Backend_QMS, que es
 * quien verifica que el medico sea el tratante del paciente y deja el asiento
 * en `ClinicalAccessLog`.
 *
 * El chat de pacientes (Bot 2) YA NO esta aca: vive en `AssistantService` y le
 * habla directo al servicio de IA en Python. Ver la nota al final del archivo.
 */
@Injectable({ providedIn: 'root' })
export class AiApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api';

  /**
   * El boton "Generar resumen" de la ficha del paciente.
   *
   * `withCredentials: true` como los otros 44 servicios: manda la cookie
   * httpOnly con el JWT, que es lo que le permite al backend saber si quien
   * pide es el medico tratante de este paciente.
   *
   * POST sin cuerpo aunque no cree nada: cada llamada gasta tokens de un
   * proveedor externo y deja asiento en `ClinicalAccessLog`. No es idempotente
   * ni cacheable, y un GET invita a que el navegador la repita solo.
   */
  getClinicalSummary(patientId: string): Observable<ClinicalSummary> {
    return this.http.post<ClinicalSummary>(
      `${this.API_URL}/patients/${patientId}/clinical-summary`,
      {},
      { withCredentials: true },
    );
  }

  // El chat de atencion al cliente YA NO PASA POR ACA.
  //
  // Antes era `chat()`, un POST a `/api/ai/chat` de Spring que reenviaba a un
  // flujo de n8n. Se reemplazo por `AssistantService`, que le habla
  // directamente al servicio de IA en Python (clinicore-ai), por dos razones:
  //
  //  1. La respuesta llega en STREAMING, palabra por palabra. `HttpClient`
  //     espera el cuerpo completo antes de emitirlo, asi que no sirve: hay que
  //     leer el `ReadableStream` de la respuesta con `fetch`.
  //  2. El agente se implemento en codigo Python, no en un flujo visual.
  //
  // El endpoint de Spring sigue existiendo, pero el frontend ya no lo llama.
  // Ver `core/api/assistant.service.ts`.
}
