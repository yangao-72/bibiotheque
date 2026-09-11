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
    if (!this.book.bookName?.trim()) errors.push('validation.bookNameRequired');
    if (!this.book.bookAuthor?.trim()) errors.push('validation.bookAuthorRequired');
    if (!this.book.bookGenre?.trim()) errors.push('validation.bookGenreRequired');
    if (this.book.noOfCopies == null || this.book.noOfCopies <= 0) {
      errors.push('validation.copiesPositive');
    }
    return errors;
  }

  // --- Soumission ---

  saveBook() {
    this.errorMessage = '';
    this.successMessage = '';

    // Validation côté client
    // On n'affiche que la première règle enfreinte : concaténer plusieurs
    // messages donne une phrase illisible, et l'utilisateur corrige de toute
    // façon un champ à la fois.
    const validationErrors = this.validate();
    if (validationErrors.length > 0) {
      this.errorMessage = validationErrors[0];
      return;
    }

    this.loading = true;

    this.booksService.createBook(this.book).subscribe({
      next: () => {
        this.successMessage = 'books.created';
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
    // Clé de traduction pour les cas génériques, message du serveur tel quel
    // quand il en fournit un (le pipe `translate` laisse passer l'inconnu).
    if (err.status === 0) return 'errors.network';
    if (err.error?.message) return err.error.message;
    if (typeof err.error === 'string' && err.error.trim()) return err.error;
    return 'errors.server';
  }
}
