import { Component, Input } from '@angular/core';

export type IllustrationName =
  | 'reading'
  | 'shelf'
  | 'reserve'
  | 'empty'
  | 'search'
  | 'locked'
  | 'member';

/**
 * Illustrations vectorielles du design system.
 *
 * Tout est dessiné en SVG inline : aucune image binaire, aucun appel réseau,
 * donc rendu identique hors-ligne et dans le conteneur Docker. Les couleurs
 * sont tirées des tokens via des dégradés `currentColor`/variables CSS, ce qui
 * les fait basculer automatiquement en thème sombre.
 *
 * Purement décoratif : `aria-hidden` et `focusable="false"` pour que les
 * lecteurs d'écran les ignorent.
 */
@Component({
  selector: 'app-illustration',
  templateUrl: './illustration.component.html',
  styleUrls: ['./illustration.component.css']
})
export class IllustrationComponent {

  @Input() name: IllustrationName = 'reading';

  /** Identifiants de dégradés uniques par instance, sinon deux SVG sur la même page entrent en collision. */
  readonly uid = `ill-${Math.random().toString(36).slice(2, 9)}`;
}
