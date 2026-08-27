import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  PLATFORM_ID,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AssistantService } from '../../../../core/api/assistant.service';
import type { AssistantEvent } from '../../../../core/api/assistant.service';
import { ChatPanelService } from '../../../../core/chat/chat-panel.service';

/** Un mensaje de la conversación. `from` decide de qué lado se dibuja. */
interface ChatMessage {
  from: 'bot' | 'user';
  text: string;
}

/**
 * El asistente de atención al cliente, flotante, para las páginas PÚBLICAS.
 *
 * DÓNDE VA Y DÓNDE NO
 *
 * Va en `/` (landing) y en `/agendar`: superficies donde el visitante todavía
 * no inició sesión. NO va en `/perfil` ni en el panel, y no es un descuido.
 * Este bot es ANÓNIMO por diseño. Si alguien que YA está logueado le
 * preguntara "¿cuál es mi turno?", el bot contestaría "por seguridad, inicie
 * sesión", y a alguien que ya inició sesión eso no se lee como una medida de
 * seguridad: se lee como que el chat está roto.
 *
 * TEXTO Y AUDIO
 *
 * El visitante puede escribir o grabar un audio. El audio NO cambia el
 * asistente: el servicio lo transcribe y el texto entra al mismo agente. Es
 * una capa de traducción en la entrada, nada más.
 *
 * STREAMING
 *
 * La respuesta se escribe fragmento por fragmento, a medida que llega del
 * servidor. No hay ningún temporizador simulando el efecto: se lee el cuerpo
 * de la respuesta HTTP mientras el servidor lo va enviando (ver
 * [AssistantService]).
 *
 * SSR: la landing está prerenderizada (ver `app.routes.server.ts`), así que
 * nada toca `sessionStorage`, `crypto` ni `navigator` hasta que el usuario
 * interactúa, y cuando lo hace se verifica `isPlatformBrowser` igual.
 */
@Component({
  selector: 'app-chat-widget',
  imports: [FormsModule],
  templateUrl: './chat-widget.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatWidget {
  private static readonly SESSION_KEY = 'clinicore_chat_session';

  /** Igual que el tope del servicio. Se corta acá para no gastar un viaje. */
  protected static readonly MAX_LENGTH = 500;
  protected readonly maxLength = ChatWidget.MAX_LENGTH;

  /**
   * Tope de duración de un audio. Un audio largo cuesta más y casi nunca es
   * una consulta legítima: nadie tarda un minuto en preguntar por un turno.
   */
  private static readonly MAX_AUDIO_MS = 60_000;

  private readonly assistant = inject(AssistantService);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly scrollArea = viewChild<ElementRef<HTMLElement>>('scrollArea');

  /**
   * Read from [ChatPanelService], not from a signal of this component's own:
   * the hero's "Contáctanos" CTA opens this same panel, and it has no path to
   * a `protected` member in here.
   */
  private readonly panel = inject(ChatPanelService);
  protected readonly open = this.panel.isOpen;

  protected readonly sending = signal(false);
  protected readonly draft = signal('');

  /**
   * Lo que el asistente está haciendo ahora mismo ("Consultando la
   * agenda..."). Viene del servidor, que sabe qué herramienta está usando.
   * Dejar al visitante mirando tres puntitos sin explicación es peor que
   * decirle qué se está consultando.
   */
  protected readonly status = signal('');

  /** Grabando audio en este momento. */
  protected readonly recording = signal(false);

  /**
   * Segundos grabados. Se muestra mientras se graba, porque hay un tope de
   * MAX_AUDIO_MS y sin verlo el visitante no tiene forma de saber cuánto le
   * queda antes de que se corte solo.
   */
  protected readonly seconds = signal(0);

  /** El navegador permite grabar. En SSR y en navegadores viejos es false. */
  protected readonly canRecord = signal(false);

  /**
   * El primer mensaje dice lo que el bot PUEDE y lo que NO. A propósito: un
   * asistente que no aclara sus límites recibe "cancelame el turno" en el
   * primer mensaje y decepciona antes de haber servido para algo.
   */
  protected readonly messages = signal<ChatMessage[]>([
    {
      from: 'bot',
      text:
        'Hola. Puedo informarle sobre nuestros médicos y especialidades, ' +
        'disponibilidad de turnos, direcciones y servicios.\n\n' +
        'Puede escribir o grabar un audio con su consulta.',
    },
  ]);

  private sessionId: string | null = null;
  private recorder: MediaRecorder | null = null;
  private trozos: Blob[] = [];
  private cortarGrabacion: ReturnType<typeof setTimeout> | null = null;
  private contador: ReturnType<typeof setInterval> | null = null;

  /**
   * Marca que la grabación se está deteniendo para DESCARTARLA, no para
   * enviarla. `MediaRecorder` tiene un solo `stop()` para los dos casos, así
   * que la decisión se guarda acá y `onstop` la consulta.
   */
  private descartar = false;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.canRecord.set(
        typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
      );
    }
  }

  protected toggle(): void {
    this.panel.toggle();
    if (this.open()) {
      this.scrollToBottom();
    }
  }

  // -------------------------------------------------------------------------
  // Texto
  // -------------------------------------------------------------------------

  protected send(): void {
    const text = this.draft().trim();
    if (!text || this.sending()) {
      return;
    }

    this.push({ from: 'user', text });
    this.draft.set('');

    void this.consumir(this.assistant.chat(this.ensureSessionId(), text));
  }

  // -------------------------------------------------------------------------
  // Audio
  // -------------------------------------------------------------------------

  /** Empieza a grabar, o detiene y ENVÍA lo grabado. */
  protected async toggleRecording(): Promise<void> {
    if (this.recording()) {
      this.detenerGrabacion();
      return;
    }
    if (this.sending() || !this.canRecord()) {
      return;
    }

    try {
      const pista = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.trozos = [];
      this.descartar = false;

      // Safari no graba webm. Se elige el primero que el navegador soporte y,
      // si no reconoce ninguno, se deja que use su formato por defecto.
      const formato = ['audio/webm', 'audio/mp4', 'audio/ogg'].find(
        (t) => MediaRecorder.isTypeSupported?.(t) ?? false,
      );

      this.recorder = new MediaRecorder(pista, formato ? { mimeType: formato } : undefined);

      this.recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.trozos.push(e.data);
        }
      };

      this.recorder.onstop = () => {
        // Soltar el micrófono: si no, el navegador deja el indicador de
        // grabación encendido en la pestaña.
        pista.getTracks().forEach((t) => t.stop());

        const audio = new Blob(this.trozos, { type: this.recorder?.mimeType || 'audio/webm' });
        const descartado = this.descartar;

        this.recorder = null;
        this.trozos = [];
        this.descartar = false;
        this.recording.set(false);
        this.seconds.set(0);

        // Cancelado: no se envía nada y no se gasta una transcripción.
        if (descartado || audio.size === 0) {
          return;
        }

        this.push({ from: 'user', text: 'Audio enviado' });
        void this.consumir(this.assistant.chatAudio(this.ensureSessionId(), audio));
      };

      this.recorder.start();
      this.recording.set(true);
      this.seconds.set(0);

      this.contador = setInterval(() => this.seconds.update((s) => s + 1), 1000);

      this.cortarGrabacion = setTimeout(
        () => this.detenerGrabacion(),
        ChatWidget.MAX_AUDIO_MS,
      );
    } catch {
      // El visitante negó el permiso del micrófono, o el equipo no tiene uno.
      this.push({
        from: 'bot',
        text: 'No pude acceder al micrófono. Revise el permiso del navegador o escriba su consulta.',
      });
    }
  }

  /**
   * Descarta la grabación en curso. No se envía nada.
   *
   * Existe porque sin él el único camino era enviar: si el visitante se
   * equivocaba al hablar, o se arrepentía, quedaba obligado a mandar el audio.
   * Y cada audio enviado es una transcripción que se paga.
   */
  protected cancelRecording(): void {
    if (!this.recording()) {
      return;
    }
    this.descartar = true;
    this.detenerGrabacion();
  }

  /** Formato m:ss para el contador. */
  protected get elapsed(): string {
    const s = this.seconds();
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  private detenerGrabacion(): void {
    if (this.cortarGrabacion) {
      clearTimeout(this.cortarGrabacion);
      this.cortarGrabacion = null;
    }
    if (this.contador) {
      clearInterval(this.contador);
      this.contador = null;
    }
    if (this.recorder && this.recorder.state !== 'inactive') {
      this.recorder.stop();
    }
  }

  // -------------------------------------------------------------------------
  // Consumo del streaming
  // -------------------------------------------------------------------------

  /**
   * Recorre los eventos del asistente y va armando la respuesta en pantalla.
   *
   * El mensaje del bot se agrega VACÍO antes del primer fragmento, y después
   * se le va concatenando el texto. Así la burbuja aparece de inmediato y
   * crece, en lugar de aparecer entera al final.
   */
  private async consumir(eventos: AsyncGenerator<AssistantEvent>): Promise<void> {
    this.sending.set(true);
    this.status.set('Pensando...');

    let burbujaAbierta = false;

    try {
      for await (const evento of eventos) {
        switch (evento.tipo) {
          case 'session':
            if (evento.sessionId) {
              this.recordarSessionId(evento.sessionId);
            }
            break;

          case 'transcripcion':
            // Se reemplaza el "🎤 Audio enviado" por lo que el paciente dijo.
            if (evento.texto) {
              this.reemplazarUltimo({ from: 'user', text: evento.texto });
            }
            break;

          case 'status':
            this.status.set(evento.texto ?? '');
            break;

          case 'delta':
            if (!burbujaAbierta) {
              this.push({ from: 'bot', text: '' });
              burbujaAbierta = true;
              this.status.set('');
            }
            this.agregarAlUltimo(evento.texto ?? '');
            break;

          case 'error':
            // El error se muestra COMO UN MENSAJE del bot, no como un banner
            // rojo aparte: mantiene la conversación en un solo hilo.
            if (burbujaAbierta) {
              this.agregarAlUltimo(`\n\n${evento.mensaje ?? 'Ocurrió un error.'}`);
            } else {
              this.push({ from: 'bot', text: evento.mensaje ?? 'Ocurrió un error.' });
            }
            break;
        }
      }
    } catch {
      this.push({
        from: 'bot',
        text: 'No pude responder en este momento. Intente de nuevo en unos segundos.',
      });
    } finally {
      this.sending.set(false);
      this.status.set('');
    }
  }

  // -------------------------------------------------------------------------
  // Mensajes
  // -------------------------------------------------------------------------

  private push(message: ChatMessage): void {
    this.messages.update((list) => [...list, message]);
    this.scrollToBottom();
  }

  private agregarAlUltimo(fragmento: string): void {
    this.messages.update((list) => {
      if (list.length === 0) {
        return list;
      }
      const copia = [...list];
      const ultimo = copia[copia.length - 1];
      copia[copia.length - 1] = { ...ultimo, text: ultimo.text + fragmento };
      return copia;
    });
    this.scrollToBottom();
  }

  private reemplazarUltimo(message: ChatMessage): void {
    this.messages.update((list) => {
      if (list.length === 0) {
        return [message];
      }
      const copia = [...list];
      copia[copia.length - 1] = message;
      return copia;
    });
  }

  private scrollToBottom(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    // Un tick para que el mensaje nuevo ya esté en el DOM antes de medir.
    setTimeout(() => {
      const el = this.scrollArea()?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }

  // -------------------------------------------------------------------------
  // Sesión
  // -------------------------------------------------------------------------

  /**
   * Agrupa los mensajes de una misma conversación en la memoria del agente.
   * NO es una credencial y no identifica a nadie: el chat es anónimo y el bot
   * nunca responde datos de un paciente concreto.
   *
   * Vive en `sessionStorage` para que la conversación sobreviva a navegar de la
   * landing a `/agendar`, y muera al cerrar la pestaña.
   */
  private ensureSessionId(): string {
    if (this.sessionId) {
      return this.sessionId;
    }

    if (isPlatformBrowser(this.platformId)) {
      try {
        const stored = sessionStorage.getItem(ChatWidget.SESSION_KEY);
        if (stored) {
          this.sessionId = stored;
          return stored;
        }
      } catch {
        // Ventana privada o almacenamiento bloqueado.
      }
    }

    this.sessionId = this.randomId();
    this.recordarSessionId(this.sessionId);
    return this.sessionId;
  }

  private recordarSessionId(id: string): void {
    this.sessionId = id;
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    try {
      sessionStorage.setItem(ChatWidget.SESSION_KEY, id);
    } catch {
      // La conversación sigue funcionando con el id en memoria; solo se
      // pierde al recargar.
    }
  }

  /**
   * `crypto.randomUUID()` solo existe en contexto seguro: anda en `localhost`,
   * pero NO en `http://IP-del-servidor` sin HTTPS, que es exactamente cómo va a
   * arrancar el despliegue. De ahí el respaldo — no hace falta que sea
   * criptográficamente fuerte, solo que no colisione entre pestañas.
   */
  private randomId(): string {
    const c = globalThis.crypto;
    if (c && typeof c.randomUUID === 'function') {
      return c.randomUUID();
    }
    return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
