import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { ArcMeterComponent } from './arc-meter.component';

describe('ArcMeterComponent', () => {
  let component: ArcMeterComponent;
  let fixture: ComponentFixture<ArcMeterComponent>;

  /** Longueur de l'arc effectivement tracé : trois quarts du périmètre. */
  function arcLength(c: ArcMeterComponent): number {
    return c.circumference * 0.75;
  }

  function load(value: number, max: number): void {
    component.value = value;
    component.max = max;
    component.ngOnChanges();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      declarations: [ArcMeterComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(ArcMeterComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should compute the percentage', () => {
    load(7, 17);
    expect(component.percent).toBe(41);
  });

  it('should report zero rather than NaN when there is nothing to measure', () => {
    // Une division par zéro afficherait « NaN % ».
    load(0, 0);

    expect(component.percent).toBe(0);
    expect(component.isEmpty).toBeTrue();
  });

  it('should show the empty message instead of a gauge with no data', () => {
    load(0, 0);

    expect(fixture.nativeElement.querySelector('.meter__gauge')).toBeNull();
    expect(fixture.nativeElement.querySelector('.meter__empty')).toBeTruthy();
  });

  it('should draw the fill from the start of the arc', () => {
    load(1, 4);

    // Le trait est raccourci, jamais décalé : un décalage dessinerait la fin de
    // l'arc et remplirait la jauge à l'envers.
    const drawn = Number(component.fillDash.split(' ')[0]);
    expect(drawn).toBeCloseTo(arcLength(component) * 0.25, 2);
  });

  it('should draw nothing at zero and the whole arc at full', () => {
    load(0, 10);
    expect(Number(component.fillDash.split(' ')[0])).toBe(0);

    load(10, 10);
    expect(Number(component.fillDash.split(' ')[0])).toBeCloseTo(arcLength(component), 2);
  });

  it('should keep the track at three quarters of the circumference', () => {
    load(5, 10);

    expect(Number(component.trackDash.split(' ')[0])).toBeCloseTo(arcLength(component), 2);
  });

  it('should expose the value to assistive technology', () => {
    load(7, 17);

    const gauge = fixture.nativeElement.querySelector('[role="meter"]');
    expect(gauge.getAttribute('aria-valuenow')).toBe('41');
    expect(gauge.getAttribute('aria-valuetext')).toBe('41%');
  });
});
