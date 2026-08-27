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
import { AiApiService } from '../../../../core/api/ai-api.service';
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
 * Este bot es ANÓNIMO por diseño — el endpoint `/api/ai/chat` es público y el
 * backend ni siquiera recibe la identidad de quien pregunta. Si alguien que YA
 * está logueado le preguntara "¿cuál es mi turno?", el bot contestaría "por
 * seguridad, inicie sesión", y a alguien que ya inició sesión eso no se lee
 * como una medida de seguridad: se lee como que el chat está roto.
 *
 * Un asistente que sí responda por el paciente logueado sería otro componente
 * contra otro endpoint, autenticado. No este.
 *
 * SSR: la landing está prerenderizada (ver `app.routes.server.ts`), así que
 * nada toca `sessionStorage` ni `crypto` hasta que el usuario interactúa, y
 * cuando lo hace se verifica `isPlatformBrowser` igual — mismo criterio que
 * `AuthService` y `RealtimeService`.
 */
@Component({
  selector: 'app-chat-widget',
  imports: [FormsModule],
  templateUrl: './chat-widget.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatWidget {
  private static readonly SESSION_KEY = 'clinicore_chat_session';

  /** Igual que el `@Size(max = 500)` de `ChatRequestDTO`. Se corta acá para no gastar un viaje. */
  protected static readonly MAX_LENGTH = 500;
  protected readonly maxLength = ChatWidget.MAX_LENGTH;

  private readonly ai = inject(AiApiService);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly scrollArea = viewChild<ElementRef<HTMLElement>>('scrollArea');

  /**
   * Read from [ChatPanelService], not from a signal of this component's own:
   * the hero's "Contáctanos" CTA opens this same panel, and it has no path to
   * a `protected` member in here. See the service for why that indirection is
   * smaller than the alternatives.
   */
  private readonly panel = inject(ChatPanelService);
  protected readonly open = this.panel.isOpen;

  protected readonly sending = signal(false);
  protected readonly draft = signal('');

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
        'Para agendar, cancelar o consultar un turno suyo, necesita ingresar a su cuenta.',
    },
  ]);

  private sessionId: string | null = null;

  protected toggle(): void {
    this.panel.toggle();
    if (this.open()) {
      this.scrollToBottom();
    }
  }

  protected send(): void {
    const text = this.draft().trim();
    if (!text || this.sending()) {
      return;
    }

    this.push({ from: 'user', text });
    this.draft.set('');
    this.sending.set(true);

    this.ai.chat(this.ensureSessionId(), text).subscribe({
      next: (response) => {
        this.push({ from: 'bot', text: response.respuesta });
        this.sending.set(false);
      },
      // El error se muestra COMO UN MENSAJE del bot, no como un banner rojo
      // aparte: mantiene la conversación en un solo hilo y no obliga al
      // visitante a entender que "algo del sistema" falló.
      error: () => {
        this.push({
          from: 'bot',
          text: 'No pude responder en este momento. Intente de nuevo en unos segundos.',
        });
        this.sending.set(false);
      },
    });
  }

  private push(message: ChatMessage): void {
    this.messages.update((list) => [...list, message]);
    this.scrollToBottom();
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
        const fresh = this.randomId();
        sessionStorage.setItem(ChatWidget.SESSION_KEY, fresh);
        this.sessionId = fresh;
        return fresh;
      } catch {
        // Ventana privada o almacenamiento bloqueado. La conversación sigue
        // funcionando con un id en memoria; solo se pierde al recargar.
      }
    }

    this.sessionId = this.randomId();
    return this.sessionId;
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
