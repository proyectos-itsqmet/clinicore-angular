import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  TemplateRef,
  ViewContainerRef,
  computed,
  forwardRef,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
  type EmbeddedViewRef,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';

/** Dónde y con qué tamaño se dibuja el panel, en coordenadas de viewport. */
interface PanelBox {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly maxHeight: number;
}

/** Una opción de la lista. `value` siempre viaja como string, igual que en un `<select>`. */
export interface SelectOption {
  readonly value: string;
  readonly label: string;
  /** Renglón secundario, opcional. Sirve para desambiguar etiquetas parecidas. */
  readonly hint?: string;
  readonly disabled?: boolean;
}

/**
 * app-select-field — la lista desplegable del sistema de diseño.
 *
 * ## Por qué no es un `<select>` con CSS
 *
 * Porque el desplegable de un `<select>` NO es del documento: lo dibuja el
 * sistema operativo. El azul chillón de la opción resaltada, la tipografía y
 * el borde de esa ventana vienen de Windows, no de esta hoja de estilos, y
 * ninguna regla CSS los alcanza — `option { background: ... }` se ignora en
 * casi todos los navegadores y no hay pseudo-elemento para el panel. Se puede
 * estilar la caja cerrada y nada más. Por eso el control abierto se reconstruye
 * acá con divs.
 *
 * Eso tiene un costo que hay que pagar entero, y es la razón de casi todo el
 * código de abajo: un `<select>` nativo trae gratis el teclado, el foco, el
 * anuncio del lector de pantalla y el cierre al hacer clic afuera. Un div con
 * `(click)` no trae nada de eso, y una lista bonita que no se puede usar con
 * el teclado es un retroceso, no un rediseño.
 *
 * ## Qué implementa, y contra qué contrato
 *
 * El patrón `combobox` + `listbox` de WAI-ARIA:
 *
 * | Tecla | Qué hace |
 * |---|---|
 * | Enter / Espacio / Alt+Abajo | abre, parada en la opción activa |
 * | Arriba / Abajo | mueve la opción ACTIVA, sin seleccionarla |
 * | Home / Fin | primera / última |
 * | Enter | confirma la activa y cierra |
 * | Escape | cierra sin cambiar nada |
 * | Tab | cierra y sigue de largo |
 *
 * Mover el resaltado sin seleccionar es deliberado: `aria-activedescendant`
 * deja el foco real en el disparador mientras el lector de pantalla anuncia la
 * opción recorrida, y así navegar la lista no dispara `(valueChange)` en cada
 * flecha. Un formulario que se recarga a cada tecla es exactamente lo que hace
 * insoportable un desplegable "mejorado".
 *
 * ## Cómo se conecta a un formulario
 *
 * Como `ControlValueAccessor`, así que `formControlName` y `[(ngModel)]`
 * funcionan sin una línea extra en el componente que lo usa. Para los casos
 * que no usan formularios está `(valueChange)`, que emite el valor pelado —
 * NO un `Event`. Los llamadores que antes leían `$event.target.value` reciben
 * ahora el string directo.
 */
@Component({
  selector: 'app-select-field',
  templateUrl: './select-field.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectField),
      multi: true,
    },
  ],
  host: {
    class: 'block relative',
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
    // Mientras está abierto hay que reubicar el panel: vive en <body> con
    // coordenadas de viewport, así que cualquier scroll lo dejaría flotando
    // lejos del disparador. `true` en la fase de captura porque el scroll de
    // un contenedor interno NO burbujea hasta window.
    '(window:resize)': 'reposition()',
  },
})
export class SelectField implements ControlValueAccessor, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly vcr = inject(ViewContainerRef);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly options = input.required<readonly SelectOption[]>();

  /** Lo que muestra el disparador cuando no hay nada elegido. */
  readonly placeholder = input('Selecciona una opción');

  readonly disabled = input(false);

  /** Id del disparador, para que un `<label for>` externo lo alcance. */
  readonly inputId = input<string | undefined>(undefined);

  /** Marca el control en rojo. La leyenda del error la pone quien lo usa. */
  readonly invalid = input(false);

  /**
   * El valor actual, para los usos SIN formulario.
   *
   * Necesario aparte del `ControlValueAccessor`: las pantallas que traen su
   * estado en un signal propio (`[value]="tipo()"` + `(change)`) no pasan por
   * `formControlName` ni por `ngModel`, y sin esta entrada un modal de EDICION
   * abriria mostrando el placeholder en lugar de lo ya guardado.
   */
  readonly value = input<string | number | null | undefined>(undefined);

  /** El valor elegido, pelado. No un `Event`. */
  readonly valueChange = output<string>();

  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panelTpl = viewChild<TemplateRef<unknown>>('panelTpl');

  /**
   * La vista del panel, montada en `<body>` mientras está abierto.
   *
   * ## Por qué el panel NO vive dentro del componente
   *
   * Porque lo recortaban. Un panel `absolute` queda atrapado por cualquier
   * ancestro con `overflow-hidden`, y este panel de administración tiene 37
   * archivos que lo usan — tarjetas, tablas y sobre todo los modales, donde
   * el desplegable de un formulario aparecía cortado a la mitad. Es el
   * problema que un `<select>` nativo no tiene: su lista la dibuja el sistema
   * operativo, fuera del documento.
   *
   * `position: fixed` tampoco alcanzaba. Un ancestro con `transform` — y los
   * modales de este proyecto llevan la clase `transform` — crea un bloque
   * contenedor nuevo, así que `fixed` deja de resolverse contra el viewport y
   * vuelve a quedar recortado. La única posición sin ancestros es `<body>`.
   *
   * Se monta a mano en lugar de usar el Overlay del CDK porque `@angular/cdk`
   * no es dependencia de este proyecto, y traerlo entero para esto sería más
   * peso del que resuelve.
   */
  private panelView: EmbeddedViewRef<unknown> | null = null;
  private scrollListener: (() => void) | null = null;

  protected readonly panelBox = signal<PanelBox>({ top: 0, left: 0, width: 0, maxHeight: 256 });

  protected readonly open = signal(false);

  /**
   * El valor vigente. `linkedSignal` y no `signal`, porque tiene DOS fuentes
   * que se pisan legítimamente: la entrada [value] y `writeValue` del
   * formulario. Un `signal` normal ignoraría los cambios posteriores de la
   * entrada (abrir el modal con otro registro no actualizaría nada); un
   * `computed` sería de solo lectura y el propio clic no podría escribirlo.
   * `linkedSignal` hace las dos: se recalcula cuando la entrada cambia y
   * acepta escrituras locales entre medio.
   */
  protected readonly selectedValue = linkedSignal<string>(() => {
    const incoming = this.value();
    return incoming === null || incoming === undefined ? '' : String(incoming);
  });

  /**
   * La opción RECORRIDA con el teclado, que no es la seleccionada.
   * -1 cuando no hay ninguna activa.
   */
  protected readonly activeIndex = signal(-1);

  /** `disabled` puede venir del input o de `setDisabledState` del formulario. */
  private readonly disabledByForm = signal(false);
  protected readonly isDisabled = computed(() => this.disabled() || this.disabledByForm());

  protected readonly selected = computed(() => {
    const current = this.selectedValue();
    return this.options().find((o) => o.value === current) ?? null;
  });

  protected readonly triggerLabel = computed(() => this.selected()?.label ?? this.placeholder());

  protected optionId(index: number): string {
    return `${this.inputId() ?? 'select'}-opt-${index}`;
  }

  protected readonly activeOptionId = computed(() => {
    const i = this.activeIndex();
    return i < 0 ? null : this.optionId(i);
  });

  // -- ControlValueAccessor --------------------------------------------------

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: unknown): void {
    // Se normaliza a string porque las opciones comparan por string, igual que
    // un `<select>`: un id numérico 7 y la opción "7" tienen que coincidir.
    this.selectedValue.set(value === null || value === undefined ? '' : String(value));
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledByForm.set(isDisabled);
  }

  // -- Apertura --------------------------------------------------------------

  protected toggle(): void {
    this.open() ? this.close() : this.openPanel();
  }

  protected openPanel(): void {
    if (this.isDisabled()) return;
    this.open.set(true);
    // Abre parado en lo ya elegido, no en el primero: así Enter-Enter no
    // cambia el valor por accidente.
    const current = this.options().findIndex((o) => o.value === this.selectedValue());
    this.activeIndex.set(current >= 0 ? current : this.firstEnabledIndex());
    this.mountPanel();
  }

  protected close(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.activeIndex.set(-1);
    this.unmountPanel();
    this.onTouched();
  }

  ngOnDestroy(): void {
    // Si el componente muere con el panel abierto — un modal que se cierra,
    // una fila que desaparece — el panel quedaría huérfano en <body> para
    // siempre, porque ya no lo contiene nadie que pueda destruirlo.
    this.unmountPanel();
  }

  private mountPanel(): void {
    const tpl = this.panelTpl();
    if (!this.isBrowser || !tpl || this.panelView) return;

    this.panelView = this.vcr.createEmbeddedView(tpl);
    for (const node of this.panelView.rootNodes as Node[]) {
      this.document.body.appendChild(node);
    }

    this.reposition();

    // Captura (`true`) y no burbujeo: el scroll de un contenedor interno no
    // llega a window, y este panel vive justamente dentro de tablas y modales
    // que scrollean solos.
    this.scrollListener = () => this.reposition();
    this.document.addEventListener('scroll', this.scrollListener, true);
  }

  private unmountPanel(): void {
    if (this.scrollListener) {
      this.document.removeEventListener('scroll', this.scrollListener, true);
      this.scrollListener = null;
    }
    if (!this.panelView) return;
    for (const node of this.panelView.rootNodes as Node[]) {
      (node as ChildNode).remove?.();
    }
    this.panelView.destroy();
    this.panelView = null;
  }

  /**
   * Recalcula dónde va el panel, y hacia qué lado abre.
   *
   * Se voltea hacia ARRIBA cuando abajo no entra y arriba hay más lugar. Sin
   * eso, un campo en la parte baja de un modal abría un panel de dos píxeles
   * de alto — que es exactamente cómo se veía el de "Género".
   */
  protected reposition(): void {
    if (!this.isBrowser || !this.open()) return;
    const el = this.trigger()?.nativeElement;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const gap = 6;
    const viewport = this.document.defaultView?.innerHeight ?? 0;
    const below = viewport - rect.bottom - gap;
    const above = rect.top - gap;

    // El tope de diseño son 256px (`max-h-64`); nunca se estira más que eso
    // aunque sobre lugar.
    const preferred = 256;
    const flipUp = below < Math.min(preferred, 160) && above > below;
    const available = Math.max(96, Math.floor(flipUp ? above : below));

    this.panelBox.set({
      top: flipUp ? 0 : Math.round(rect.bottom + gap),
      left: Math.round(rect.left),
      width: Math.round(rect.width),
      maxHeight: Math.min(preferred, available),
    });

    // Volteado hacia arriba el panel se ancla por su BORDE INFERIOR, así que
    // el `top` de arriba no sirve: se calcula después de medir el alto real.
    if (flipUp) {
      const panel = this.panelView?.rootNodes[0] as HTMLElement | undefined;
      const height = Math.min(panel?.scrollHeight ?? 0, Math.min(preferred, available));
      this.panelBox.update((box) => ({ ...box, top: Math.round(rect.top - gap - height) }));
    }
  }

  protected onDocumentPointerDown(event: Event): void {
    if (!this.open()) return;
    const target = event.target as Node | null;
    if (!target) return;
    // El panel ya NO está dentro del host — vive en <body> —, así que hay que
    // preguntarle a los dos por separado. Con solo el host, un clic sobre una
    // opción contaba como "clic afuera" y cerraba antes de seleccionar.
    if (this.host.nativeElement.contains(target)) return;
    const panelRoot = this.panelView?.rootNodes[0] as HTMLElement | undefined;
    if (panelRoot?.contains(target)) return;
    this.close();
  }

  protected select(option: SelectOption): void {
    if (option.disabled) return;
    this.selectedValue.set(option.value);
    this.onChange(option.value);
    this.valueChange.emit(option.value);
    this.close();
    this.trigger()?.nativeElement.focus();
  }

  // -- Teclado ---------------------------------------------------------------

  protected onKeydown(event: KeyboardEvent): void {
    if (this.isDisabled()) return;

    if (!this.open()) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault();
        this.openPanel();
      }
      return;
    }

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.close();
        this.trigger()?.nativeElement.focus();
        break;
      case 'Enter':
      case ' ': {
        event.preventDefault();
        const option = this.options()[this.activeIndex()];
        if (option) this.select(option);
        break;
      }
      case 'ArrowDown':
        event.preventDefault();
        this.move(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.move(-1);
        break;
      case 'Home':
        event.preventDefault();
        this.activeIndex.set(this.firstEnabledIndex());
        break;
      case 'End':
        event.preventDefault();
        this.activeIndex.set(this.lastEnabledIndex());
        break;
      case 'Tab':
        // Sin `preventDefault`: Tab tiene que seguir moviendo el foco. Cerrar
        // y dejarlo pasar es lo que hace un `<select>` nativo.
        this.close();
        break;
      default:
        break;
    }
  }

  /**
   * Mueve la opción activa saltando las deshabilitadas, SIN dar la vuelta.
   *
   * Sin vuelta a propósito: en una lista larga, pasar de la última a la
   * primera con una flecha desorienta más de lo que ayuda, y es lo que hace el
   * control nativo.
   */
  private move(step: number): void {
    const options = this.options();
    if (options.length === 0) return;

    let i = this.activeIndex();
    for (let guard = 0; guard < options.length; guard++) {
      i += step;
      if (i < 0 || i >= options.length) return;
      if (!options[i].disabled) {
        this.activeIndex.set(i);
        return;
      }
    }
  }

  private firstEnabledIndex(): number {
    return this.options().findIndex((o) => !o.disabled);
  }

  private lastEnabledIndex(): number {
    const options = this.options();
    for (let i = options.length - 1; i >= 0; i--) {
      if (!options[i].disabled) return i;
    }
    return -1;
  }
}
