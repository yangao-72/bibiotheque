import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { AppComponent } from './app.component';

/** Composants factices : seule la donnée de route nous intéresse ici. */
@Component({ template: '' })
class AvecShellComponent { }

@Component({ template: '' })
class SansShellComponent { }

describe('AppComponent', () => {
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot(),
        RouterTestingModule.withRoutes([
          { path: 'tableau', component: AvecShellComponent },
          { path: 'connexion', component: SansShellComponent, data: { chrome: false } }
        ])
      ],
      declarations: [AppComponent, AvecShellComponent, SansShellComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it(`should have as title 'BiblioGest'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance.title).toEqual('BiblioGest');
  });

  it('should start with the sidebar closed and toggle it', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    expect(app.sidebarOpen).toBeFalse();

    app.toggleSidebar();
    expect(app.sidebarOpen).toBeTrue();

    app.toggleSidebar();
    expect(app.sidebarOpen).toBeFalse();
  });

  // --- Affichage du shell selon la route ------------------------------------

  it('should show the sidebar and topbar on an ordinary route', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    router.navigate(['/tableau']);
    tick();
    fixture.detectChanges();

    expect(fixture.componentInstance.showChrome).toBeTrue();
    expect(fixture.nativeElement.querySelector('app-sidebar')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-topbar')).toBeTruthy();
  }));

  it('should hide the sidebar and topbar on a route marked chrome: false', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    router.navigate(['/connexion']);
    tick();
    fixture.detectChanges();

    // L'écran de connexion occupe la page seul : la navigation n'offrirait que
    // des liens inaccessibles à un visiteur non authentifié.
    expect(fixture.componentInstance.showChrome).toBeFalse();
    expect(fixture.nativeElement.querySelector('app-sidebar')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-topbar')).toBeNull();
  }));

  it('should keep a single router outlet across the two layouts', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    router.navigate(['/connexion']);
    tick();
    fixture.detectChanges();

    // Dupliquer le router-outlet dans deux branches détruirait et recréerait le
    // composant de page à chaque bascule.
    expect(fixture.nativeElement.querySelectorAll('router-outlet').length).toBe(1);

    router.navigate(['/tableau']);
    tick();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('router-outlet').length).toBe(1);
  }));

  it('should widen the layout when the shell is hidden', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    router.navigate(['/connexion']);
    tick();
    fixture.detectChanges();

    // Sans la barre latérale fixe ni la barre du haut, le contenu doit
    // récupérer la largeur et la hauteur qu'elles réservaient.
    const layout = fixture.nativeElement.querySelector('.app-layout');
    expect(layout.classList).toContain('app-layout--bare');
  }));

  it('should close the mobile drawer when navigating', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    fixture.componentInstance.sidebarOpen = true;

    router.navigate(['/tableau']);
    tick();
    fixture.detectChanges();

    // Sans cela, le tiroir reste ouvert au-dessus de l'écran suivant.
    expect(fixture.componentInstance.sidebarOpen).toBeFalse();
  }));
});
