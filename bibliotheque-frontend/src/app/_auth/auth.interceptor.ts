import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { UserAuthService } from '../_service/user-auth.service';
import { Injectable } from '@angular/core';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private userAuthService: UserAuthService,
    private router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (req.headers.get('No-Auth') === 'True') {
      return next.handle(req.clone());
    }

    const token = this.userAuthService.getToken();

    req = this.addToken(req, token);

    return next.handle(req).pipe(
        catchError(
            (err: HttpErrorResponse) => {
                if (err.status === 401) {
                    this.router.navigate(['/login']);
                } else if (err.status === 403 && !this.porteUnMessageMetier(err)) {
                    // 403 « droits insuffisants », sans corps exploitable : l'écran
                    // dédié est la bonne réponse.
                    this.router.navigate(['/forbidden']);
                }
                // Un 403 porteur d'un message métier (par exemple RS-04 : « 403
                // Forbidden = vous n'avez pas le droit ») est destiné à l'écran
                // appelant : le rediriger ferait perdre l'explication. Comme pour
                // les 400/404/409/500, on laisse donc passer l'erreur pour que le
                // composant affiche le texte du serveur.
                return throwError(() => err);
            }
        )
    );
  }

  /** Le serveur a-t-il joint une explication affichable à l'erreur ? */
  private porteUnMessageMetier(err: HttpErrorResponse): boolean {
    const corps: any = err.error;
    if (typeof corps === 'string') {
      return corps.trim().length > 0;
    }
    return corps != null && typeof corps.message === 'string' && corps.message.trim().length > 0;
  }

  private addToken(request: HttpRequest<any>, token: string) {
      return request.clone(
          {
              setHeaders: {
                  Authorization: `Bearer ${token}`
              }
          }
      );
  }
}
