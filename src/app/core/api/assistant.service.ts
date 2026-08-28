import { Injectable } from '@angular/core';

export interface AssistantEvent {
  tipo: 'session' | 'transcripcion' | 'status' | 'delta' | 'done' | 'error';
  texto?: string;
  mensaje?: string;
  sessionId?: string;
}

@Injectable({ providedIn: 'root' })
export class AssistantService {
  private static readonly AI_URL = '/api';

  async *chat(sessionId: string, mensaje: string): AsyncGenerator<AssistantEvent> {
    const respuesta = await fetch(`${AssistantService.AI_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, mensaje }),
    });

    yield* this.leerEventos(respuesta);
  }

  async *chatAudio(sessionId: string, audio: Blob): AsyncGenerator<AssistantEvent> {
    const cuerpo = new FormData();

    cuerpo.append('file', audio, 'grabacion.webm');
    cuerpo.append('session_id', sessionId);

    const respuesta = await fetch(`${AssistantService.AI_URL}/chat/audio`, {
      method: 'POST',
      body: cuerpo,
    });

    yield* this.leerEventos(respuesta);
  }

  private async *leerEventos(respuesta: Response): AsyncGenerator<AssistantEvent> {
    if (!respuesta.ok || !respuesta.body) {
      yield { tipo: 'error', mensaje: `El asistente respondió ${respuesta.status}.` };
      return;
    }

    const lector = respuesta.body.getReader();
    const decodificador = new TextDecoder();
    let pendiente = '';

    try {
      for (;;) {
        const { done, value } = await lector.read();
        if (done) {
          break;
        }

        pendiente += decodificador.decode(value, { stream: true });

        const bloques = pendiente.split('\n\n');
        pendiente = bloques.pop() ?? '';

        for (const bloque of bloques) {
          const evento = this.parsear(bloque);
          if (evento) {
            yield evento;
          }
        }
      }

      const ultimo = this.parsear(pendiente);
      if (ultimo) {
        yield ultimo;
      }
    } finally {
      lector.releaseLock();
    }
  }

  private parsear(bloque: string): AssistantEvent | null {
    const lineas = bloque.split('\n');
    let tipo = '';
    let datos = '';

    for (const linea of lineas) {
      if (linea.startsWith('event:')) {
        tipo = linea.slice(6).trim();
      } else if (linea.startsWith('data:')) {
        datos += linea.slice(5).trim();
      }
    }

    if (!tipo || !datos) {
      return null;
    }

    try {
      const cuerpo = JSON.parse(datos) as {
        texto?: string;
        mensaje?: string;
        session_id?: string;
      };
      return {
        tipo: tipo as AssistantEvent['tipo'],
        texto: cuerpo.texto,
        mensaje: cuerpo.mensaje,
        sessionId: cuerpo.session_id,
      };
    } catch {
      return null;
    }
  }
}
