import { Component, OnInit } from '@angular/core';
import { Books } from '../_model/books';
import { Borrow } from '../_model/borrow';
import { BooksService } from '../_service/books.service';
import { BorrowService } from '../_service/borrow.service';
import { UserAuthService } from '../_service/user-auth.service';

@Component({
  selector: 'app-return-book',
  templateUrl: './return-book.component.html',
  styleUrls: ['./return-book.component.css']
})
export class ReturnBookComponent implements OnInit {

  books: Books[] = [];
  borrow: Borrow[] = [];
  loading = true;
  errorMessage = '';
  successMessage = '';

  constructor(
    private borrowService: BorrowService,
    private booksService: BooksService,
    private userAuthService: UserAuthService
  ) { }

  userId = this.userAuthService.getUserId();

  ngOnInit(): void {
    this.loadData();
  }

  private loadData() {
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
    this.borrowService.getBooksBorrowedByUser(this.userId).subscribe({
      next: data => {
        this.borrow = data;
      },
      error: err => {
        this.errorMessage = this.extractErrorMessage(err);
      }
    });
  }

  brw: Borrow = new Borrow();

  public returnBook(borrowId: number) {
    if (!window.confirm('Confirmer le retour de ce livre ?')) return;
    this.successMessage = '';
    this.errorMessage = '';
    this.brw.borrowId = borrowId;
    this.borrowService.returnBook(this.brw).subscribe({
      next: () => {
        this.successMessage = 'Livre retourné avec succès.';
        this.loadData();
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: err => {
        this.errorMessage = this.extractErrorMessage(err);
        setTimeout(() => this.errorMessage = '', 8000);
      }
    });
  }

  retry() {
    this.loadData();
  }

  private extractErrorMessage(err: any): string {
    if (err.status === 0) return 'Le serveur est injoignable. Vérifiez que le backend est démarré.';
    if (err.error?.message) return err.error.message;
    if (typeof err.error === 'string') return err.error;
    return `Erreur ${err.status} : une erreur inattendue est survenue.`;
  }
}
