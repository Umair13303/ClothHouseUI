import { Directive, ElementRef, HostListener } from '@angular/core';

/**
 * Native `<input type="date">` only opens its calendar from the tiny
 * indicator icon — which Angular Material's input styles hide inside a
 * mat-form-field, leaving no visible way to open it. This pops the
 * browser's calendar as soon as the field is clicked or focused, so date
 * fields behave the way data-entry users expect.
 */
@Directive({
  selector: 'input[type="date"]',
  standalone: true
})
export class NativeDatePickerDirective {
  constructor(private el: ElementRef<HTMLInputElement>) {}

  @HostListener('click')
  @HostListener('focus')
  openPicker(): void {
    const input = this.el.nativeElement;
    if (input.disabled || input.readOnly) return;
    try {
      input.showPicker?.();
    } catch {
      // showPicker requires a user gesture (e.g. programmatic focus on
      // load) — ignore and let the user click to open instead.
    }
  }
}
