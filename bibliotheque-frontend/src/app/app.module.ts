import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http'
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BooksListComponent } from './books-list/books-list.component';
import { CreateBookComponent } from './create-book/create-book.component';
import { FormsModule } from '@angular/forms';
import { UpdateBookComponent } from './update-book/update-book.component';
import { BookDetailsComponent } from './book-details/book-details.component';
import { RegistrationComponent } from './registration/registration.component';
import { UsersListComponent } from './users-list/users-list.component';
import { UserDetailsComponent } from './user-details/user-details.component';
import { UpdateUserComponent } from './update-user/update-user.component';
import { LoginComponent } from './login/login.component';
import { LogoutComponent } from './logout/logout.component';
import { HeaderComponent } from './header/header.component';
import { HomeComponent } from './home/home.component';
import { BooksService } from './_service/books.service';
import { UsersService } from './_service/users.service';
import { RouterModule } from '@angular/router';
import { AuthGuard } from './_auth/auth.guard';
import { AuthInterceptor } from './_auth/auth.interceptor';
import { ForbiddenComponent } from './forbidden/forbidden.component';
import { BorrowBookComponent } from './borrow-book/borrow-book.component';
import { ReturnBookComponent } from './return-book/return-book.component';
import { ReservationsComponent } from './reservations/reservations.component';
import { ReservationsListComponent } from './reservations-list/reservations-list.component';
import { ReservationFormComponent } from './reservation-form/reservation-form.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient } from '@angular/common/http';
import { APP_INITIALIZER } from '@angular/core';
import { LanguageService } from './_service/language.service';
import { IllustrationComponent } from './_ui/illustration/illustration.component';
import { ToastContainerComponent } from './_ui/toast/toast-container.component';
import { ConfirmDialogComponent } from './_ui/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from './_ui/empty-state/empty-state.component';
import { LanguageSwitcherComponent } from './_ui/language-switcher/language-switcher.component';
import { BarChartComponent } from './_ui/bar-chart/bar-chart.component';
import { ArcMeterComponent } from './_ui/arc-meter/arc-meter.component';

/** Charge les fichiers de traduction depuis src/assets/i18n/<langue>.json. */
export function createTranslateLoader(http: HttpClient): TranslateLoader {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

/** Applique la langue mémorisée avant le premier rendu. */
export function initLanguage(languageService: LanguageService): () => void {
  return () => languageService.init();
}

@NgModule({
  declarations: [
    AppComponent,
    BooksListComponent,
    CreateBookComponent,
    UpdateBookComponent,
    BookDetailsComponent,
    RegistrationComponent,
    UsersListComponent,
    UserDetailsComponent,
    UpdateUserComponent,
    LoginComponent,
    LogoutComponent,
    HeaderComponent,
    HomeComponent,
    ForbiddenComponent,
    BorrowBookComponent,
    ReturnBookComponent,
    ReservationsComponent,
    ReservationsListComponent,
    ReservationFormComponent,
    SidebarComponent,
    TopbarComponent,
    DashboardComponent,
    IllustrationComponent,
    ToastContainerComponent,
    ConfirmDialogComponent,
    EmptyStateComponent,
    LanguageSwitcherComponent,
    BarChartComponent,
    ArcMeterComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    RouterModule,
    TranslateModule.forRoot({
      defaultLanguage: 'fr',
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [HttpClient]
      }
    })
  ],
  providers: [
    AuthGuard,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    UsersService,
    BooksService,
    {
      provide: APP_INITIALIZER,
      useFactory: initLanguage,
      deps: [LanguageService],
      multi: true
    }
   ],
  bootstrap: [AppComponent]
})
export class AppModule { }
