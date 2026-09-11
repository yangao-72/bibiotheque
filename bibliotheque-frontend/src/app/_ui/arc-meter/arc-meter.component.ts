import { Component, Input, OnChanges } from '@angular/core';

/**
 * Jauge en arc — un ratio unique contre une limite.
 *
 * C'est un « meter », pas un camembert à deux parts : la piste n'est pas une
 * seconde catégorie mais le reste de l'échelle, et elle porte un pas plus clair
 * de la même rampe. Une seule teinte, donc aucun problème de distinction sous
 * déficience de perception des couleurs.
 */
@Component({
  selector: 'app-arc-meter',
  templateUrl: './arc-meter.component.html',
  styleUrls: ['./arc-meter.component.css']
})
export class ArcMeterComponent implements OnChanges {

  @Input() value = 0;
  @Input() max = 0;
  @Input() titleKey = '';
  @Input() captionKey = '';
  @Input() emptyKey = 'chart.noData';

  /** Rayon et périmètre de l'arc, en unités du viewBox. */
  readonly radius = 62;
  readonly circumference = 2 * Math.PI * 62;

  /** Fraction de l'arc effectivement dessinée : trois quarts de tour. */
  private readonly sweep = 0.75;

  percent = 0;
  /** Piste : les trois quarts du perimetre. */
  trackDash = '';
  /** Remplissage : la fraction atteinte, mesuree depuis le debut de l'arc. */
  fillDash = '';

  ngOnChanges(): void {
    this.percent = this.max > 0 ? Math.round((this.value / this.max) * 100) : 0;

    const arcLength = this.circumference * this.sweep;
    this.trackDash = `${arcLength} ${this.circumference}`;

    // On raccourcit le trait plutot que de le decaler : un `stroke-dashoffset`
    // positif deplace le motif vers l'arriere et dessinait la *fin* de l'arc,
    // si bien que la jauge se remplissait a l'envers.
    this.fillDash = `${arcLength * (this.percent / 100)} ${this.circumference}`;
  }

  get isEmpty(): boolean {
    return this.max <= 0;
  }
}
