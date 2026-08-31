import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Books } from '../_model/books';
import { BooksService } from '../_service/books.service';

@Component({
  selector: 'app-create-book',
  templateUrl: './create-book.component.html',
  styleUrls: ['./create-book.component.css']
})
export class CreateBookComponent implements OnInit {

  book: Books = new Books();
  errorMessage = '';
  successMessage = '';
  loading = false;

  constructor(private booksService: BooksService,
    private router: Router) { }

  ngOnInit(): void {
  }

  // --- Validation ---

  get isFormValid(): boolean {
    return !!(
      this.book.bookName?.trim() &&
      this.book.bookAuthor?.trim() &&
      this.book.bookGenre?.trim() &&
      this.book.noOfCopies != null &&
      this.book.noOfCopies > 0
    );
  }

  validate(): string[] {
    const errors: string[] = [];
    if (!this.book.bookName?.trim()) errors.push('Le nom du livre est obligatoire.');
    if (!this.book.bookAuthor?.trim()) errors.push('L\'auteur est obligatoire.');
    if (!this.book.bookGenre?.trim()) errors.push('Le genre est obligatoire.');
    if (this.book.noOfCopies == null || this.book.noOfCopies <= 0) {
      errors.push('Le nombre de copies doit être supérieur à 0.');
    }
    return errors;
  }

  // --- Soumission ---

  saveBook() {
    this.errorMessage = '';
    this.successMessage = '';

    // Validation côté client
    const validationErrors = this.validate();
    if (validationErrors.length > 0) {
      this.errorMessage = validationErrors.join(' ');
      return;
    }

    this.loading = true;

    this.booksService.createBook(this.book).subscribe({
      next: () => {
        this.successMessage = 'Livre créé avec succès.';
        this.loading = false;
        setTimeout(() => this.goToBooksList(), 1500);
      },
      error: err => {
        this.loading = false;
        this.errorMessage = this.extractErrorMessage(err);
      }
    });
  }

  goToBooksList() {
    this.router.navigate(['/books']);
  }

  onSubmit() {
    this.saveBook();
  }

  private extractErrorMessage(err: any): string {
    if (err.status === 0) return 'Le serveur est injoignable. Vérifiez que le backend est démarré.';
    if (err.error?.message) return err.error.message;
    if (typeof err.error === 'string') return err.error;
    return `Erreur ${err.status} : une erreur inattendue est survenue.`;
  }
}
