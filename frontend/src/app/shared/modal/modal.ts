import {
  afterNextRender,
  Component,
  ElementRef,
  input,
  OnDestroy,
  output,
  viewChild,
} from '@angular/core';

let nextModalId = 0;

/**
 * Accessible modal built on the native <dialog>: focus is trapped, Escape closes it and focus
 * returns to the opener. Render it with `@if` - it opens when created and closes when destroyed.
 * While `locked` (a request is in flight) Escape and backdrop clicks are ignored.
 */
@Component({
  selector: 'app-modal',
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
})
export class Modal implements OnDestroy {
  readonly heading = input.required<string>();
  readonly locked = input(false);
  /** Emitted when the user dismisses the modal (Escape, backdrop or the close button). */
  readonly dismissed = output<void>();

  protected readonly titleId = `modal-title-${nextModalId++}`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    afterNextRender(() => {
      const el = this.dialog().nativeElement;
      if (typeof el.showModal === 'function') {
        el.showModal();
      } else {
        el.setAttribute('open', '');
      }
    });
  }

  ngOnDestroy(): void {
    const el = this.dialog().nativeElement;
    if (typeof el.close === 'function') el.close();
  }

  protected onCancel(event: Event): void {
    // Native Escape handling would close the dialog behind Angular's back.
    event.preventDefault();
    this.dismiss();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.dismiss();
  }

  protected dismiss(): void {
    if (!this.locked()) this.dismissed.emit();
  }
}
