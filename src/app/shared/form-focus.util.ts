/**
 * Shared helper to move focus to the first invalid field after a failed
 * save/submit attempt.
 *
 * Usage (inside the component's invalid branch, after markAllAsTouched()
 * or after setting the screen's validate flag):
 *
 *   focusFirstInvalidField(this.elementRef.nativeElement);
 *
 * The scan runs one tick later so Angular has applied the latest
 * validation state (ng-invalid / is-invalid / data-invalid) to the DOM.
 *
 * A field is picked up when it matches any of:
 *   - input/select/textarea with Angular's ng-invalid class (reactive forms)
 *   - .is-invalid            (Bootstrap-style flag already used in templates)
 *   - .input-invalid         (settings room/shift row validation)
 *   - [data-invalid="true"]  (marker for custom dropdown widgets that have
 *                             no native form element)
 * The first visible, enabled match in DOM order is scrolled to the centre
 * of the viewport and focused.
 */

const INVALID_FIELD_SELECTOR = [
  'input.ng-invalid:not([type="hidden"])',
  'select.ng-invalid',
  'textarea.ng-invalid',
  'input.is-invalid:not([type="hidden"])',
  'select.is-invalid',
  'textarea.is-invalid',
  '.is-invalid',
  '.input-invalid',
  '[data-invalid="true"]'
].join(', ');

const FOCUSABLE_CHILD_SELECTOR =
  'input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled), [tabindex]';

function isVisible(el: HTMLElement): boolean {
  return el.getClientRects().length > 0;
}

function isDisabled(el: HTMLElement): boolean {
  return (el as HTMLInputElement).disabled === true;
}

function isNativeFormField(el: HTMLElement): boolean {
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
}

export function focusFirstInvalidField(host: HTMLElement | Document = document): void {
  setTimeout(() => {
    const candidates = Array.from(
      host.querySelectorAll<HTMLElement>(INVALID_FIELD_SELECTOR)
    ).filter(el => isVisible(el) && !isDisabled(el));

    const target = candidates[0];
    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const focusTarget = isNativeFormField(target) || target.matches(FOCUSABLE_CHILD_SELECTOR)
      ? target
      : target.querySelector<HTMLElement>(FOCUSABLE_CHILD_SELECTOR);
    focusTarget?.focus({ preventScroll: true });
  });
}
