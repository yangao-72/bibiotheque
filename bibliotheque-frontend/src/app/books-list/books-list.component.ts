import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Books } from '../_model/books'
import { BooksService } from '../_service/books.service';

@Component({
  selector: 'app-books-list',
  templateUrl: './books-list.component.html',
  styleUrls: ['./books-list.component.css']
})
export class BooksListComponent implements OnInit {

  books: Books[] = [];
  loading = true;
  errorMessage = '';
  successMessage = '';

  constructor(private booksService: BooksService,
    private router: Router) { }

  ngOnInit(): void {
    this.getBooks();
  }

  private getBooks() {
    this.loading = true;
    this.errorMessage = '';
    this.booksService.getBooksList().subscribe({
      next: data => {
        this.books = data;
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.errorMessage = this.extractErrorMessage(err);
      }
    });
  }

  updateBook(bookId: number) {
    this.router.navigate(['update-book', bookId ]);
  }

  deleteBook(bookId: number) {
    if (!window.confirm('Supprimer ce livre définitivement ?')) return;
    this.booksService.deleteBook(bookId).subscribe({
      next: () => {
        this.successMessage = 'Livre supprimé avec succès.';
        this.getBooks();
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: err => {
        this.errorMessage = this.extractErrorMessage(err);
        setTimeout(() => this.errorMessage = '', 8000);
      }
    });
  }

  bookDetails(bookId: number) {
    this.router.navigate(['book-details', bookId ]);
  }

  retry() {
    this.getBooks();
  }

  private extractErrorMessage(err: any): string {
    if (err.status === 0) return 'Le serveur est injoignable. Vérifiez que le backend est démarré.';
    if (err.error?.message) return err.error.message;
    if (typeof err.error === 'string') return err.error;
    return `Erreur ${err.status} : une erreur inattendue est survenue.`;
  }
}
