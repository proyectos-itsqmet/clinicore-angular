import { Injectable } from '@angular/core';

/**
 * Un evento del asistente, tal como lo emite el servicio Python (clinicore-ai).
 *
 * | tipo          | qué significa                                          |
 * |---------------|--------------------------------------------------------|
 * | session       | el id de conversación que asignó el servidor            |
 * | transcripcion | lo que el paciente dijo en un audio, ya pasado a texto  |
 * | status        | "Consultando la agenda..." — para el indicador de carga |
 * | delta         | un fragmento de la respuesta, apenas llega              |
 * | done          | la respuesta completa                                   |
 * | error         | algo falló                                              |
 */
export interface AssistantEvent {
  tipo: 'session' | 'transcripcion' | 'status' | 'delta' | 'done' | 'error';
  texto?: string;
  mensaje?: string;
  sessionId?: string;
}

/**
 * El asistente virtual de pacientes.
 *
 * POR QUÉ `fetch` Y NO `HttpClient`
 *
 * El servicio responde con Server-Sent Events sobre un POST, y hay que ir
 * leyendo el cuerpo MIENTRAS llega. `HttpClient` de Angular espera a tener la
 * respuesta completa antes de emitirla: con él el streaming se pierde y la
 * respuesta aparece toda de golpe al final. `fetch` da acceso al
 * `ReadableStream` del cuerpo, que es lo único que permite escribir palabra
 * por palabra de verdad.
 *
 * (`EventSource`, la API nativa de SSE, tampoco sirve: solo hace GET y no
 * permite enviar un cuerpo ni subir un archivo de audio.)
 *
 * Los métodos son generadores asíncronos, así que del lado del componente se
 * consumen con un `for await` y se lee de arriba a abajo.
 */
@Injectable({ providedIn: 'root' })
export class AssistantService {
  /**
   * El servicio de IA en Python. Es un proceso aparte del backend Spring: el
   * agente vive ahí, con la API de OpenAI y sus herramientas.
   *
   * Igual que los demás servicios de este proyecto, la URL está fija para el
   * entorno local. Al desplegar hay que moverla a la configuración de entorno,
   * junto con los `localhost:8080` del resto de los servicios.
   */
  private static readonly AI_URL = 'http://localhost:8000';

  /** Mensaje de texto. Devuelve los eventos a medida que llegan. */
  async *chat(sessionId: string, mensaje: string): AsyncGenerator<AssistantEvent> {
    const respuesta = await fetch(`${AssistantService.AI_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, mensaje }),
    });

    yield* this.leerEventos(respuesta);
  }

  /** Audio grabado. El servicio lo transcribe y responde por el mismo canal. */
  async *chatAudio(sessionId: string, audio: Blob): AsyncGenerator<AssistantEvent> {
    const cuerpo = new FormData();
    // El campo se llama "file" porque así lo espera el servicio Python.
    cuerpo.append('file', audio, 'grabacion.webm');
    cuerpo.append('session_id', sessionId);

    const respuesta = await fetch(`${AssistantService.AI_URL}/chat/audio`, {
      method: 'POST',
      body: cuerpo,
    });

    yield* this.leerEventos(respuesta);
  }

  /**
   * Lee el cuerpo de la respuesta y va entregando los eventos SSE.
   *
   * El formato de cada evento es:
   *
   *     event: delta
   *     data: {"texto":"Hola"}
   *
   * y van separados por una línea en blanco. Un fragmento del stream puede
   * cortar un evento por la mitad, así que se acumula en `pendiente` y solo se
   * procesa lo que ya está completo.
   */
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

        // Se procesan los bloques completos y se guarda el último trozo, que
        // puede estar cortado a la mitad.
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
      // Un bloque mal formado no debe cortar la conversación entera.
      return null;
    }
  }
}
