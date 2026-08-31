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

  saveBook() {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
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
