import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Books } from '../_model/books';
import { ReservationRequest } from '../_model/reservation';
import { Users } from '../_model/users';

@Component({
  selector: 'app-reservation-form',
  templateUrl: './reservation-form.component.html',
  styleUrls: ['./reservation-form.component.css']
})
export class ReservationFormComponent {

  @Input() books: Books[] = [];
  @Input() users: Users[] = [];
  @Input() formError = '';
  @Output() formErrorChange = new EventEmitter<string>();
  @Input() formSuccess = '';
  @Output() formSuccessChange = new EventEmitter<string>();
  @Input() isFormValid = false;
  @Input() reservation: ReservationRequest = new ReservationRequest();
  @Output() reservationChange = new EventEmitter<ReservationRequest>();
  @Output() submitForm = new EventEmitter<void>();

  onLivreChange(livreId: number): void {
    this.reservation.livreId = livreId;
    this.reservationChange.emit(this.reservation);
  }

  onAdherentChange(adherentId: number): void {
    this.reservation.adherentId = adherentId;
    this.reservationChange.emit(this.reservation);
  }

  onSubmit(): void {
    if (this.isFormValid) {
      this.submitForm.emit();
    }
  }

  closeFormError(): void {
    this.formError = '';
    this.formErrorChange.emit('');
  }

  closeFormSuccess(): void {
    this.formSuccess = '';
    this.formSuccessChange.emit('');
  }
}
