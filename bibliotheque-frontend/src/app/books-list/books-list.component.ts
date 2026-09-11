import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Books } from '../_model/books'
import { BooksService } from '../_service/books.service';
import { ToastService } from '../_ui/toast/toast.service';
import { ConfirmService } from '../_ui/confirm-dialog/confirm.service';

type SortColumn = 'bookName' | 'bookAuthor' | 'bookGenre';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-books-list',
  templateUrl: './books-list.component.html',
  styleUrls: ['./books-list.component.css']
})
export class BooksListComponent implements OnInit {

  books: Books[] = [];
  /** Résultat de la recherche et du tri, ce que le tableau affiche réellement. */
  visible: Books[] = [];
  loading = true;
  errorMessage = '';
  successMessage = '';

  query = '';
  sortColumn: SortColumn = 'bookName';
  sortDirection: SortDirection = 'asc';

  readonly skeletonRows = Array.from({ length: 5 });

  constructor(private booksService: BooksService,
    private router: Router,
    private toast: ToastService,
    private confirm: ConfirmService) { }

  ngOnInit(): void {
    this.getBooks();
  }

  private getBooks() {
    this.loading = true;
    this.errorMessage = '';
    this.booksService.getBooksList().subscribe({
      next: data => {
        this.books = data;
        this.refresh();
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

  async deleteBook(book: Books): Promise<void> {
    // Remplace window.confirm() : la boîte native n'est ni traduisible ni accessible.
    const confirmed = await this.confirm.ask({
      titleKey: 'books.deleteConfirmTitle',
      textKey: 'books.deleteConfirmText',
      params: { name: book.bookName },
      confirmKey: 'common.delete',
      danger: true
    });

    if (!confirmed) {
      return;
    }

    this.booksService.deleteBook(book.bookId).subscribe({
      next: () => {
        this.toast.success('books.deleted');
        this.getBooks();
      },
      error: err => {
        this.toast.showText('error', this.extractErrorMessage(err));
      }
    });
  }

  // --- Recherche et tri ----------------------------------------------------

  onQueryChange(value: string): void {
    this.query = value;
    this.refresh();
  }

  sortBy(column: SortColumn): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.refresh();
  }

  isSorted(column: SortColumn): boolean {
    return this.sortColumn === column;
  }

  sortIcon(column: SortColumn): string {
    if (!this.isSorted(column)) { return 'fa-sort'; }
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  trackById(_index: number, book: Books): number {
    return book.bookId;
  }

  private refresh(): void {
    const needle = this.query.trim().toLowerCase();

    const filtered = needle
      ? this.books.filter(b =>
          `${b.bookName} ${b.bookAuthor} ${b.bookGenre}`.toLowerCase().includes(needle))
      : [...this.books];

    const direction = this.sortDirection === 'asc' ? 1 : -1;
    const column = this.sortColumn;

    this.visible = filtered.sort((a, b) =>
      String(a[column] ?? '').localeCompare(String(b[column] ?? ''), undefined, { numeric: true }) * direction);
  }

  bookDetails(bookId: number) {
    this.router.navigate(['book-details', bookId ]);
  }

  retry() {
    this.getBooks();
  }

  private extractErrorMessage(err: any): string {
    // Clé de traduction pour les cas génériques, message du serveur tel quel
    // quand il en fournit un.
    if (err.status === 0) return 'errors.network';
    if (err.error?.message) return err.error.message;
    if (typeof err.error === 'string' && err.error.trim()) return err.error;
    return 'errors.server';
  }
}
