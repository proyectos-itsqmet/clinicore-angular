import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Client, ReconnectionTimeMode } from '@stomp/stompjs';
import type { IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { NEVER, Observable, Subject } from 'rxjs';

/**
 * Coarse connection state for the small "live vs. stale" indicator.
 * `connecting` covers both the very first attempt and every automatic
 * retry — the UI never needs to know how many attempts have happened.
 */
export type RealtimeConnectionStatus = 'connecting' | 'open' | 'closed';

/**
 * Owns a single STOMP-over-SockJS connection to the backend broker and
 * hands out per-topic Observables. Deliberately generic (any destination
 * string) so other admin screens (e.g. the waiting-room display) can reuse
 * it instead of each feature opening its own socket.
 *
 * Callers must treat every emitted message as a SIGNAL ONLY, never as data:
 * `enableSimpleBroker` on the backend performs no per-subscription
 * authorization, so any authenticated client can subscribe to any
 * `/topic/...` destination. The correct pattern is "a message arrived on
 * this topic -> re-fetch the authoritative state over REST", never
 * "read the fields off this message".
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly platformId = inject(PLATFORM_ID);

  /** Matches the `.addEndpoint("/ws-turns").withSockJS()` registration in `WebSocketConfig`. */
  private readonly BROKER_URL = 'http://localhost:8080/ws-turns';

  /** First retry waits 1s; each subsequent retry doubles, capped at 30s. */
  private readonly INITIAL_RECONNECT_DELAY_MS = 1000;
  private readonly MAX_RECONNECT_DELAY_MS = 30_000;

  private client: Client | null = null;
  private readonly topicSubjects = new Map<string, Subject<IMessage>>();
  private readonly topicSubscriptions = new Map<string, StompSubscription>();

  readonly status = signal<RealtimeConnectionStatus>('closed');

  /**
   * Subscribes to a STOMP destination. Connects lazily on the first call
   * (across all destinations) and tears the whole connection down once the
   * last listener of the last topic unsubscribes. Multiple concurrent
   * listeners on the same destination share one underlying STOMP
   * subscription.
   *
   * During SSR this returns an Observable that never connects and never
   * emits — there is no WebSocket/XHR global to connect with on the server,
   * and the browser tab will do the real subscribing on hydration.
   */
  subscribeTopic(destination: string): Observable<IMessage> {
    if (!isPlatformBrowser(this.platformId)) {
      return NEVER;
    }

    return new Observable<IMessage>((subscriber) => {
      const subject = this.acquireTopic(destination);
      const innerSubscription = subject.subscribe(subscriber);

      return () => {
        innerSubscription.unsubscribe();
        this.releaseTopic(destination);
      };
    });
  }

  private acquireTopic(destination: string): Subject<IMessage> {
    let subject = this.topicSubjects.get(destination);
    if (!subject) {
      subject = new Subject<IMessage>();
      this.topicSubjects.set(destination, subject);
      this.subscribeStompIfConnected(destination);
      this.ensureConnecting();
    }
    return subject;
  }

  private releaseTopic(destination: string): void {
    const subject = this.topicSubjects.get(destination);
    if (!subject || subject.observed) {
      return;
    }

    this.topicSubscriptions.get(destination)?.unsubscribe();
    this.topicSubscriptions.delete(destination);
    this.topicSubjects.delete(destination);
    subject.complete();

    if (this.topicSubjects.size === 0) {
      this.status.set('closed');
      void this.client?.deactivate();
    }
  }

  private ensureConnecting(): void {
    const client = this.client ?? this.createClient();
    if (!client.active) {
      this.status.set('connecting');
      client.activate();
    }
  }

  private subscribeStompIfConnected(destination: string): void {
    if (this.client?.connected) {
      this.stompSubscribe(destination);
    }
  }

  private stompSubscribe(destination: string): void {
    const client = this.client;
    if (!client) {
      return;
    }
    const subscription = client.subscribe(destination, (message) => {
      this.topicSubjects.get(destination)?.next(message);
    });
    this.topicSubscriptions.set(destination, subscription);
  }

  private createClient(): Client {
    const client = new Client({
      webSocketFactory: () => new SockJS(this.BROKER_URL),
      // Cookie-based auth (`jwt` httpOnly cookie) travels automatically on
      // every SockJS XHR fallback transport — sockjs-client sends
      // `withCredentials: true` by default — and on the raw WebSocket
      // handshake, so no Authorization header wiring is needed here.
      reconnectDelay: this.INITIAL_RECONNECT_DELAY_MS,
      maxReconnectDelay: this.MAX_RECONNECT_DELAY_MS,
      reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
      onConnect: () => {
        this.status.set('open');
        // Subscriptions do not survive a reconnect on the broker side —
        // stomp.js calls onConnect again after every automatic retry, so
        // re-subscribing everything currently desired here also covers
        // recovering from a dropped connection.
        for (const destination of this.topicSubjects.keys()) {
          this.stompSubscribe(destination);
        }
      },
      onWebSocketClose: () => {
        // Only downgrade the indicator if the client is still trying —
        // a deliberate deactivate() already set 'closed' itself.
        if (this.client?.active) {
          this.status.set('connecting');
        }
      },
    });
    this.client = client;
    return client;
  }
}
