import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

/** Lightweight stand-in for modules that arrive in later sprints. Content comes from route data. */
@Component({
  selector: 'app-placeholder',
  templateUrl: './placeholder.html',
  styleUrl: './placeholder.scss',
})
export class Placeholder {
  private readonly route = inject(ActivatedRoute);
  private readonly data = toSignal(this.route.data, { initialValue: this.route.snapshot.data });

  protected readonly heading = computed(() => String(this.data()['heading'] ?? 'Coming soon'));
  protected readonly description = computed(() => String(this.data()['description'] ?? ''));
}
