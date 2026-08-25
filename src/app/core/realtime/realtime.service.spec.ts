import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { IMessage } from '@stomp/stompjs';

import { RealtimeService } from './realtime.service';

/**
 * Fake `@stomp/stompjs` Client, defined inside `vi.hoisted` so it exists
 * before `vi.mock`'s factory runs (vi.mock is hoisted above all imports,
 * including the transitive `import { Client } from '@stomp/stompjs'` inside
 * `realtime.service.ts` — a plain `class` declared later in this file would
 * still be in its temporal dead zone at that point).
 *
 * It mirrors only the API surface `RealtimeService` relies on
 * (activate/deactivate/subscribe/connected/active plus the constructor
 * callbacks), so tests can drive STOMP lifecycle events deterministically
 * with zero real network activity — no SockJS, no server.
 */
const stompMocks = vi.hoisted(() => {
  class FakeStompClient {
    static instances: FakeStompClient[] = [];

    connected = false;
    active = false;
    config: { onConnect?: () => void; onWebSocketClose?: (evt: unknown) => void };
    activateCallCount = 0;
    deactivateCallCount = 0;
    subscribedDestinations: string[] = [];
    private readonly handlers = new Map<string, (message: unknown) => void>();

    constructor(config: FakeStompClient['config']) {
      this.config = config;
      FakeStompClient.instances.push(this);
    }

    activate(): void {
      this.activateCallCount += 1;
      this.active = true;
    }

    deactivate(): Promise<void> {
      this.deactivateCallCount += 1;
      this.active = false;
      this.connected = false;
      return Promise.resolve();
    }

    subscribe(destination: string, callback: (message: unknown) => void) {
      this.subscribedDestinations.push(destination);
      this.handlers.set(destination, callback);
      return { id: destination, unsubscribe: () => {} };
    }

    /** Test helper: simulate the broker delivering a message on a destination. */
    emit(destination: string, message: unknown = {}): void {
      this.handlers.get(destination)?.(message);
    }

    /** Test helper: simulate a successful STOMP CONNECT frame from the broker. */
    simulateConnect(): void {
      this.connected = true;
      this.config.onConnect?.();
    }

    /** Test helper: simulate the underlying WebSocket dropping (stomp.js schedules its own retry). */
    simulateClose(): void {
      this.connected = false;
      this.config.onWebSocketClose?.({});
    }
  }

  return { FakeStompClient };
});

vi.mock('@stomp/stompjs', () => ({
  Client: stompMocks.FakeStompClient,
  ReconnectionTimeMode: { LINEAR: 0, EXPONENTIAL: 1 },
}));

type FakeClient = InstanceType<(typeof stompMocks)['FakeStompClient']>;

describe('RealtimeService', () => {
  beforeEach(() => {
    stompMocks.FakeStompClient.instances = [];
    TestBed.configureTestingModule({});
  });

  /**
   * Hygiene, NOT a fix for the known flake — read on before deleting or trusting.
   *
   * `RealtimeService` is `providedIn: 'root'`, so without an explicit reset the
   * same instance can survive into the next test, carrying its client and its
   * subscriber counts. Resetting is correct practice regardless.
   *
   * ## The flake this does NOT fix (measured 2026-08-25)
   *
   * This file's 6-of-7 cascading failure is REAL but comes from OUTSIDE it:
   *
   * - alone (`--include='**\/realtime.service.spec.ts'`): **10 of 10 green**
   * - inside the full suite: **2 failures in 14 runs**
   *
   * So the spec is sound; the interference is cross-file. The only other spec
   * touching STOMP or this service is
   * `features/admin/turns/turn-list.component.spec.ts`, and `vi.mock` plus the
   * `static instances` array on the hoisted fake are module-registry state that
   * parallel vitest workers can share.
   *
   * Fixing it means constraining the RUNNER (file parallelism / isolation), not
   * editing this file — and `@angular/build:unit-test` owns the vitest config,
   * so there is no `vitest.config.*` here to change. Left open deliberately.
   */
  afterEach(() => {
    TestBed.resetTestingModule();
    stompMocks.FakeStompClient.instances = [];
  });

  function create(platform: 'browser' | 'server' = 'browser'): RealtimeService {
    TestBed.overrideProvider(PLATFORM_ID, { useValue: platform });
    return TestBed.inject(RealtimeService);
  }

  function firstClient(): FakeClient {
    return stompMocks.FakeStompClient.instances[0] as FakeClient;
  }

  it('activates the STOMP client and delivers a message published on the subscribed topic', () => {
    const service = create();
    const received: IMessage[] = [];

    service.subscribeTopic('/topic/stablishment/1/2026-08-24').subscribe((msg) => received.push(msg));

    const client = firstClient();
    expect(client.activateCallCount).toBe(1);

    client.simulateConnect();
    client.emit('/topic/stablishment/1/2026-08-24', { body: 'irrelevant' });

    expect(received).toHaveLength(1);
  });

  it('does not deliver messages published on a different topic', () => {
    const service = create();
    const received: IMessage[] = [];

    service.subscribeTopic('/topic/stablishment/1/2026-08-24').subscribe((msg) => received.push(msg));

    const client = firstClient();
    client.simulateConnect();
    client.emit('/topic/stablishment/2/2026-08-24', {});

    expect(received).toHaveLength(0);
  });

  it('reuses a single STOMP subscription for two concurrent listeners on the same topic', () => {
    const service = create();
    const destination = '/topic/stablishment/1/2026-08-24';

    const subA = service.subscribeTopic(destination).subscribe();
    service.subscribeTopic(destination).subscribe();

    const client = firstClient();
    client.simulateConnect();

    expect(client.subscribedDestinations.filter((d) => d === destination)).toHaveLength(1);
    subA.unsubscribe();
  });

  it('deactivates the client only after the last subscriber on the last topic unsubscribes', () => {
    const service = create();
    const destination = '/topic/stablishment/1/2026-08-24';

    const subA = service.subscribeTopic(destination).subscribe();
    const subB = service.subscribeTopic(destination).subscribe();
    const client = firstClient();
    client.simulateConnect();

    subA.unsubscribe();
    expect(client.deactivateCallCount).toBe(0);

    subB.unsubscribe();
    expect(client.deactivateCallCount).toBe(1);
  });

  it('re-subscribes every active topic after a reconnect', () => {
    const service = create();
    const destination = '/topic/stablishment/1/2026-08-24';
    const received: IMessage[] = [];

    service.subscribeTopic(destination).subscribe((msg) => received.push(msg));
    const client = firstClient();
    client.simulateConnect();
    client.simulateClose();
    client.simulateConnect(); // broker reconnected — stomp.js re-invokes onConnect

    client.emit(destination, {});

    expect(received).toHaveLength(1);
    expect(client.subscribedDestinations.filter((d) => d === destination)).toHaveLength(2);
  });

  it('exposes connection status transitions: closed -> connecting -> open -> closed', () => {
    const service = create();
    expect(service.status()).toBe('closed');

    const sub = service.subscribeTopic('/topic/stablishment/1/2026-08-24').subscribe();
    expect(service.status()).toBe('connecting');

    firstClient().simulateConnect();
    expect(service.status()).toBe('open');

    sub.unsubscribe();
    expect(service.status()).toBe('closed');
  });

  it('never opens a socket during server-side rendering', () => {
    const service = create('server');
    const received: IMessage[] = [];

    const sub = service.subscribeTopic('/topic/stablishment/1/2026-08-24').subscribe((msg) => received.push(msg));

    expect(stompMocks.FakeStompClient.instances).toHaveLength(0);
    sub.unsubscribe();
  });
});
