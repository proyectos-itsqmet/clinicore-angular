import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * app-live-dot — the pulsing green dot (design/Main.dc.html `.dot`).
 * Purely decorative: it always sits next to a text label ("En vivo",
 * "Agenda abierta hoy") that carries the actual meaning, so it is
 * `aria-hidden` unconditionally — it has no input because the design
 * never varies it.
 */
@Component({
  selector: 'app-live-dot',
  templateUrl: './live-dot.html',
  styleUrl: './live-dot.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveDot {}
