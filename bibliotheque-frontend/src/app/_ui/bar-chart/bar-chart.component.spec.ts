import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { BarChartComponent, BarDatum } from './bar-chart.component';

describe('BarChartComponent', () => {
  let component: BarChartComponent;
  let fixture: ComponentFixture<BarChartComponent>;

  function datum(label: string, value: number): BarDatum {
    return { label, fullLabel: `${label} complet`, value };
  }

  /** Alimente le composant comme le ferait une liaison @Input, puis rend le DOM. */
  function load(data: BarDatum[]): void {
    component.data = data;
    component.ngOnChanges();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      declarations: [BarChartComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(BarChartComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // --- Échelle -------------------------------------------------------------

  it('should round the scale up to a multiple of four', () => {
    // Une échelle qui s'arrête pile sur la valeur maximale donne des
    // graduations comme 3,33 : illisibles.
    load([datum('a', 5), datum('b', 2)]);

    expect(component.scaleMax).toBe(8);
    expect(component.ticks).toEqual([8, 6, 4, 2, 0]);
  });

  it('should keep a floor of four on small values', () => {
    load([datum('a', 1), datum('b', 0)]);

    expect(component.scaleMax).toBe(4);
    expect(component.ticks).toEqual([4, 3, 2, 1, 0]);
  });

  it('should compute bar heights against the scale, not the raw maximum', () => {
    load([datum('a', 4), datum('b', 2)]);

    // scaleMax vaut 4 : la plus grande colonne occupe toute la hauteur.
    expect(component.bars[0].heightPct).toBe(100);
    expect(component.bars[1].heightPct).toBe(50);
  });

  // --- Étiquetage ----------------------------------------------------------

  it('should flag only the extreme for direct labelling', () => {
    load([datum('a', 2), datum('b', 5), datum('c', 3)]);

    expect(component.bars.map(b => b.isMax)).toEqual([false, true, false]);
  });

  it('should flag every tied maximum', () => {
    load([datum('a', 3), datum('b', 3)]);

    expect(component.bars.every(b => b.isMax)).toBeTrue();
  });

  it('should not flag anything when every value is zero', () => {
    load([datum('a', 0), datum('b', 0)]);

    expect(component.bars.some(b => b.isMax)).toBeFalse();
  });

  // --- État vide -----------------------------------------------------------

  it('should report an empty series when the total is zero', () => {
    load([datum('a', 0), datum('b', 0)]);

    expect(component.isEmpty).toBeTrue();
    expect(fixture.nativeElement.querySelector('.chart__plot')).toBeNull();
  });

  it('should not paint a bar for a zero value', () => {
    load([datum('a', 3), datum('b', 0)]);

    // Un moignon dans la couleur de la série se lirait « un peu », pas « zéro ».
    const painted = fixture.nativeElement.querySelectorAll('.chart__bar');
    expect(painted.length).toBe(1);
  });

  it('should sum the series for the table footer', () => {
    load([datum('a', 3), datum('b', 2), datum('c', 0)]);

    expect(component.total).toBe(5);
  });

  // --- Vue tableau ---------------------------------------------------------

  it('should swap the plot for a table when toggled', () => {
    load([datum('a', 3)]);
    expect(fixture.nativeElement.querySelector('.chart__plot')).toBeTruthy();

    component.toggleTable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.chart__plot')).toBeNull();
    expect(fixture.nativeElement.querySelector('.chart__table')).toBeTruthy();
  });
});
