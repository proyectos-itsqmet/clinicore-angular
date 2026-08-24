import type { SelectOption } from '../../shared/ui/molecules/select-field/select-field';

/**
 * The gender values the doctors endpoint accepts, and the words a human reads
 * for them.
 *
 * ONE ARRAY FOR THE WHOLE FEATURE. The list's create dialog, the detail page's
 * edit dialog and the detail page's read-only field all need the same mapping,
 * and the version this replaces had it written out three times — twice as
 * `<option>` markup and once as a nested ternary. Three copies of an enum
 * translation is three chances for one of them to lag behind the API.
 */
export const GENDER_OPTIONS: readonly SelectOption[] = [
  { value: 'GENDER_MALE', label: 'Masculino' },
  { value: 'GENDER_FEMALE', label: 'Femenino' },
  { value: 'GENDER_OTHER', label: 'Otro' },
];

/** Falls back to the raw value: an unknown enum should be visible, not hidden. */
export function genderLabel(value: string): string {
  return GENDER_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

/**
 * Centinela de "sin especialidad del catálogo" en los dos formularios de doctor.
 *
 * POR QUÉ EL SELECT NO REEMPLAZA AL TEXTO, SINO QUE LO ESCRIBE: el backend acepta
 * `specialityId` o `speciality` (texto libre), y cuando recibe el id copia el
 * nombre del catálogo al campo de texto. Los formularios hacen lo mismo del lado
 * del cliente — elegir del select escribe el nombre en el control de texto — así
 * el campo obligatorio queda satisfecho sin validadores dinámicos y el payload
 * viaja con los dos valores diciendo lo mismo.
 *
 * Y cuando el catálogo está VACÍO el select no se muestra: la pantalla cae al
 * texto libre, que es exactamente cómo funcionaba antes. Un desplegable sin
 * opciones sería un formulario que no se puede completar.
 */
export const NO_SPECIALITY = 0;
