import { Component, Input } from '@angular/core';
import { IllustrationName } from '../illustration/illustration.component';

/**
 * État vide illustré.
 *
 * Un tableau vide n'explique rien : cet écran dit ce qui manque et propose
 * l'action qui permet d'en sortir.
 */
@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.component.html'
})
export class EmptyStateComponent {

  @Input() art: IllustrationName = 'empty';
  @Input() titleKey = 'empty.reservationsTitle';
  @Input() textKey = 'empty.reservationsText';
  @Input() params?: Record<string, unknown>;
}
