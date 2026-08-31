import { Component, OnInit } from '@angular/core';
import { Books } from '../_model/books';
import { Borrow } from '../_model/borrow';
import { BooksService } from '../_service/books.service';
import { BorrowService } from '../_service/borrow.service';
import { UserAuthService } from '../_service/user-auth.service';

@Component({
  selector: 'app-borrow-book',
  templateUrl: './borrow-book.component.html',
  styleUrls: ['./borrow-book.component.css']
})
export class BorrowBookComponent implements OnInit {

  books: Books[] = [];
  loading = true;
  errorMessage = '';
  successMessage = '';

  constructor(
    private booksService: BooksService,
    private userAuthService: UserAuthService,
    private borrowService: BorrowService,
  ) { }

  userId = this.userAuthService.getUserId();

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

  borrow: Borrow = new Borrow();

  borrowBook(bookId: number) {
    this.successMessage = '';
    this.errorMessage = '';
    this.borrow.bookId = bookId;
    this.borrow.userId = this.userId;
    this.borrowService.borrowBook(this.borrow).subscribe({
      next: () => {
        this.successMessage = 'Livre emprunté avec succès.';
        this.getBooks();
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: err => {
        this.errorMessage = this.extractErrorMessage(err);
        setTimeout(() => this.errorMessage = '', 8000);
      }
    });
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
