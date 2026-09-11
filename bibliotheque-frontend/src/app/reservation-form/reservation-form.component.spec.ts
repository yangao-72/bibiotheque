import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ReservationFormComponent } from './reservation-form.component';
import { Books } from '../_model/books';
import { Users } from '../_model/users';
import { ReservationRequest } from '../_model/reservation';

describe('ReservationFormComponent', () => {
  let component: ReservationFormComponent;
  let fixture: ComponentFixture<ReservationFormComponent>;

  const mockBooks: Books[] = [
    { bookId: 10, bookName: 'L1 - Livre disponible', bookAuthor: 'Auteur', bookGenre: 'Test', noOfCopies: 0 },
    { bookId: 11, bookName: 'L2 - Livre emprunté', bookAuthor: 'Auteur', bookGenre: 'Test', noOfCopies: 0 }
  ];

  const mockUsers: Users[] = [
    { userId: 11, username: 'a1', name: 'Adhérent A1', password: '', role: [] },
    { userId: 12, username: 'a2', name: 'Adhérent A2', password: '', role: [] }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, TranslateModule.forRoot()],
      declarations: [ReservationFormComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(ReservationFormComponent);
    component = fixture.componentInstance;
    component.books = mockBooks;
    component.users = mockUsers;
    component.reservation = new ReservationRequest();
    // Vue par défaut des tests : celle du BIBLIOTHECAIRE, qui choisit l'adhérent.
    component.estBibliothecaire = true;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the form title', () => {
    const title = fixture.nativeElement.querySelector('h3');
    expect(title.textContent).toContain('reservations.createTitle');
  });

  it('should display book dropdown options', () => {
    const options = fixture.nativeElement.querySelectorAll('select[name="livreId"] option');
    expect(options.length).toBe(3);
    expect(options[1].textContent).toContain('L1 - Livre disponible');
    expect(options[2].textContent).toContain('L2 - Livre emprunté');
  });

  it('should display user dropdown options', () => {
    const options = fixture.nativeElement.querySelectorAll('select[name="adherentId"] option');
    expect(options.length).toBe(3);
    expect(options[1].textContent).toContain('Adhérent A1');
    expect(options[2].textContent).toContain('Adhérent A2');
  });

  it('should hide the member dropdown for an ADHERENT', () => {
    component.estBibliothecaire = false;
    fixture.detectChanges();

    // RS-04 : un adhérent ne choisit pas pour qui il réserve, le serveur le déduit du token.
    const select = fixture.nativeElement.querySelector('select[name="adherentId"]');
    expect(select).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('reservations.forYourself');
  });

  it('should disable submit button when form is invalid', () => {
    component.reservation = new ReservationRequest();
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(btn.disabled).toBeTrue();
  });

  it('should enable submit button when both fields are filled', () => {
    component.reservation.livreId = 10;
    component.reservation.adherentId = 11;
    component.isFormValid = true;
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(btn.disabled).toBeFalse();
  });

  it('should emit submitForm on valid submit', () => {
    spyOn(component.submitForm, 'emit');
    component.reservation.livreId = 10;
    component.reservation.adherentId = 11;
    component.isFormValid = true;

    component.onSubmit();

    expect(component.submitForm.emit).toHaveBeenCalled();
  });

  it('should not emit submitForm on invalid submit', () => {
    spyOn(component.submitForm, 'emit');
    component.reservation.livreId = null;
    component.reservation.adherentId = null;

    component.onSubmit();

    expect(component.submitForm.emit).not.toHaveBeenCalled();
  });

  it('should emit reservationChange on livre change', () => {
    spyOn(component.reservationChange, 'emit');

    component.onLivreChange(10);

    expect(component.reservation.livreId).toBe(10);
    expect(component.reservationChange.emit).toHaveBeenCalled();
  });

  it('should emit reservationChange on adherent change', () => {
    spyOn(component.reservationChange, 'emit');

    component.onAdherentChange(11);

    expect(component.reservation.adherentId).toBe(11);
    expect(component.reservationChange.emit).toHaveBeenCalled();
  });

  it('should show a placeholder option in the book dropdown', () => {
    const placeholder = fixture.nativeElement.querySelector('select[name="livreId"] option:first-child');
    expect(placeholder.textContent).toContain('reservations.chooseBook');
  });

  it('should show a placeholder option in the member dropdown', () => {
    const placeholder = fixture.nativeElement.querySelector('select[name="adherentId"] option:first-child');
    expect(placeholder.textContent).toContain('reservations.chooseMember');
  });

  it('should close error message on closeFormError', () => {
    component.formError = 'Erreur test';
    spyOn(component.formErrorChange, 'emit');

    component.closeFormError();

    expect(component.formError).toBe('');
    expect(component.formErrorChange.emit).toHaveBeenCalledWith('');
  });

  it('should close success message on closeFormSuccess', () => {
    component.formSuccess = 'Succès test';
    spyOn(component.formSuccessChange, 'emit');

    component.closeFormSuccess();

    expect(component.formSuccess).toBe('');
    expect(component.formSuccessChange.emit).toHaveBeenCalledWith('');
  });
});
