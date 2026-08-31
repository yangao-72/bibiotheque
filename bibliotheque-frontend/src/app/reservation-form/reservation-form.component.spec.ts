import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
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
      imports: [FormsModule],
      declarations: [ReservationFormComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ReservationFormComponent);
    component = fixture.componentInstance;
    component.books = mockBooks;
    component.users = mockUsers;
    component.reservation = new ReservationRequest();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display form title', () => {
    const title = fixture.nativeElement.querySelector('h3');
    expect(title.textContent).toContain('Créer une réservation');
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

  it('should display error message when formError is set', () => {
    component.formError = 'RG-01 : livre disponible';
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('.toast-error');
    expect(alert).toBeTruthy();
    expect(alert.textContent).toContain('RG-01');
  });

  it('should display success message when formSuccess is set', () => {
    component.formSuccess = 'Réservation créée avec succès.';
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('.toast-success');
    expect(alert).toBeTruthy();
    expect(alert.textContent).toContain('succès');
  });

  it('should not display error when formError is empty', () => {
    component.formError = '';
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('.toast-error');
    expect(alert).toBeNull();
  });

  it('should not display success when formSuccess is empty', () => {
    component.formSuccess = '';
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('.toast-success');
    expect(alert).toBeNull();
  });

  it('should show placeholder text in book dropdown', () => {
    const placeholder = fixture.nativeElement.querySelector('select[name="livreId"] option:first-child');
    expect(placeholder.textContent).toContain('Sélectionner un livre');
  });

  it('should show placeholder text in user dropdown', () => {
    const placeholder = fixture.nativeElement.querySelector('select[name="adherentId"] option:first-child');
    expect(placeholder.textContent).toContain('Sélectionner un adhérent');
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
