import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  title = 'BiblioGest';
  sidebarOpen = false;

  /**
   * Faux sur les écrans qui doivent occuper la page seuls — la connexion, par
   * exemple, où la barre latérale et la barre du haut n'offriraient que des
   * liens inaccessibles à un visiteur non authentifié.
   */
  showChrome = true;

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.showChrome = this.chromeDemande(this.route);
        // Le tiroir mobile doit se refermer en changeant de page, sinon il
        // reste ouvert au-dessus de l'écran suivant.
        this.sidebarOpen = false;
      });
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  /**
   * Lit `data.chrome` sur la route la plus profonde : c'est elle qui décrit
   * l'écran réellement affiché.
   */
  private chromeDemande(route: ActivatedRoute): boolean {
    let courante = route;
    while (courante.firstChild) {
      courante = courante.firstChild;
    }
    return courante.snapshot.data['chrome'] !== false;
  }
}
