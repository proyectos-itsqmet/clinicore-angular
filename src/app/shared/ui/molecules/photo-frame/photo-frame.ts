import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AssetUrlPipe } from '../../pipes/asset-url.pipe';

export type PhotoFrameRadius = 'sm' | 'lg';

/**
 * app-photo-frame — a framed photo panel (design/Main.dc.html's hero inset
 * and bento photos): radius 28 (`sm`) or 32 (`lg`), clipped, with an
 * optional white border + deep shadow (the hero inset treatment) and an
 * optional Ken Burns drift (`animate`, scale 1 → 1.09 over 14s, alternating
 * — the exact `.kb` rule from the board, reusing its global `@keyframes kb`
 * from `shared/tokens/base.css`).
 *
 * `alt` is required — this frame has no notion of "decorative", the caller
 * decides and passes `alt=""` explicitly when that's the case. An optional
 * `referenceCaption` renders the "fotografía de referencia" note under the
 * frame for stand-ins that haven't been replaced with the real session yet.
 *
 * `src` is resolved through `assetUrl` here, same as every other molecule
 * that renders an `<img>` — see the "Asset resolution" note in the
 * molecules README. The pipe is idempotent, so a caller passing an
 * already-resolved path (e.g. an organism that pre-resolves a shared
 * gallery array) is safe too.
 */
@Component({
  selector: 'app-photo-frame',
  imports: [AssetUrlPipe],
  templateUrl: './photo-frame.html',
  styleUrl: './photo-frame.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class PhotoFrame {
  readonly src = input.required<string>();
  readonly alt = input.required<string>();
  readonly radius = input<PhotoFrameRadius>('sm');
  readonly bordered = input(false);
  readonly animate = input(false);
  /** CSS `transform-origin` for the Ken Burns drift, e.g. `'64% 46%'`. */
  readonly transformOrigin = input('50% 50%');
  readonly referenceCaption = input<string | undefined>(undefined);

  protected readonly frameClasses = computed(() =>
    [
      'relative overflow-hidden',
      this.radius() === 'lg' ? 'rounded-panel-lg' : 'rounded-panel-sm',
      this.bordered() ? 'border-[3px] border-surface/50 shadow-[0_30px_60px_-20px_rgb(12_43_75_/_0.55)]' : '',
    ]
      .filter(Boolean)
      .join(' '),
  );

  protected readonly imageClasses = computed(() =>
    ['h-full w-full object-cover', this.animate() ? 'kb' : ''].filter(Boolean).join(' '),
  );
}
