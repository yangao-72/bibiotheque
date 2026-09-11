import { Component, Input, OnChanges } from '@angular/core';

export interface BarDatum {
  /** Libellé court affiché sous la colonne (ex. « lun. »). */
  label: string;
  /** Libellé complet, pour l'infobulle et la vue tableau. */
  fullLabel: string;
  value: number;
}

interface Bar extends BarDatum {
  /** Hauteur en pourcentage de l'échelle, pas de la valeur maximale brute. */
  heightPct: number;
  isMax: boolean;
}

/**
 * Graphique en colonnes, série unique.
 *
 * Construit en HTML/CSS plutôt qu'en SVG : les cibles de survol sont de vrais
 * boutons (donc focalisables au clavier), et le texte ne s'étire pas avec le
 * conteneur.
 *
 * Choix de forme : magnitude dans le temps, une seule série — donc une seule
 * teinte et aucune légende, le titre nomme déjà ce qui est tracé.
 */
@Component({
  selector: 'app-bar-chart',
  templateUrl: './bar-chart.component.html',
  styleUrls: ['./bar-chart.component.css']
})
export class BarChartComponent implements OnChanges {

  @Input() data: BarDatum[] = [];
  @Input() titleKey = '';
  @Input() subtitleKey = '';
  /** Unité employée dans l'infobulle et la vue tableau. */
  @Input() unitKey = '';

  bars: Bar[] = [];
  /** Graduations de l'axe vertical, du haut vers le bas. */
  ticks: number[] = [];
  scaleMax = 0;
  showTable = false;

  ngOnChanges(): void {
    this.build();
  }

  toggleTable(): void {
    this.showTable = !this.showTable;
  }

  get total(): number {
    return this.data.reduce((sum, d) => sum + d.value, 0);
  }

  get isEmpty(): boolean {
    return this.total === 0;
  }

  private build(): void {
    const max = Math.max(0, ...this.data.map(d => d.value));

    // L'échelle monte jusqu'à un nombre rond : des graduations à 3,33 seraient
    // illisibles. En dessous de 4, on garde un pas de 1.
    this.scaleMax = max <= 4 ? Math.max(4, max) : Math.ceil(max / 4) * 4;
    const step = this.scaleMax / 4;
    this.ticks = [4, 3, 2, 1, 0].map(i => Math.round(step * i));

    this.bars = this.data.map(d => ({
      ...d,
      heightPct: this.scaleMax === 0 ? 0 : (d.value / this.scaleMax) * 100,
      // On n'étiquette que l'extrême : une valeur sur chaque colonne ne se lit pas.
      isMax: max > 0 && d.value === max
    }));
  }
}
