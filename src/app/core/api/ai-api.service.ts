import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { ChatResponse, ClinicalSummary } from '../models';

/**
 * Los dos asistentes de IA. Ambos pasan por Backend_QMS, nunca por n8n
 * directamente: n8n no publica puerto al mundo y el navegador no sabe que
 * existe.
 *
 * Notar la asimetria de `withCredentials` entre los dos metodos. No es un
 * descuido: es el contrato de cada endpoint.
 */
@Injectable({ providedIn: 'root' })
export class AiApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = '/api';

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

  /**
   * El chat de atencion al cliente de la landing.
   *
   * SIN `withCredentials`, a proposito. El endpoint es publico y anonimo, y el
   * backend ni siquiera recibe `Authentication` en la firma. Mandar la cookie
   * seria pedirle al servidor una identidad que este canal no debe usar: si la
   * tuviera, la tentacion de responder "su turno es el jueves" aparece sola y
   * el bot pasaria a exponer datos de paciente por una via pensada para
   * informacion publica.
   *
   * El dia que haya un asistente que SI responda por el paciente logueado, va
   * a ser otro metodo contra otro endpoint, con la cookie puesta.
   */
  chat(sessionId: string, mensaje: string): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.API_URL}/ai/chat`, { sessionId, mensaje });
  }
}
