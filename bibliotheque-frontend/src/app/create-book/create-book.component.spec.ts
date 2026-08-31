import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { CreateBookComponent } from './create-book.component';
import { BooksService } from '../_service/books.service';

describe('CreateBookComponent', () => {
  let component: CreateBookComponent;
  let fixture: ComponentFixture<CreateBookComponent>;
  let booksServiceSpy: jasmine.SpyObj<BooksService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('BooksService', ['createBook']);

    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        HttpClientTestingModule,
        RouterTestingModule
      ],
      declarations: [CreateBookComponent],
      providers: [
        { provide: BooksService, useValue: spy }
      ]
    }).compileComponents();

    booksServiceSpy = TestBed.inject(BooksService) as jasmine.SpyObj<BooksService>;

    fixture = TestBed.createComponent(CreateBookComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // --- Validation côté client ---

  it('should not be valid when all fields are empty', () => {
    component.book.bookName = '';
    component.book.bookAuthor = '';
    component.book.bookGenre = '';
    component.book.noOfCopies = 0;
    expect(component.isFormValid).toBeFalse();
  });

  it('should be valid when all fields are filled', () => {
    component.book.bookName = 'Le Petit Prince';
    component.book.bookAuthor = 'Saint-Exupéry';
    component.book.bookGenre = 'Roman';
    component.book.noOfCopies = 5;
    expect(component.isFormValid).toBeTrue();
  });

  it('should not be valid when bookName is empty', () => {
    component.book.bookName = '';
    component.book.bookAuthor = 'Auteur';
    component.book.bookGenre = 'Genre';
    component.book.noOfCopies = 3;
    expect(component.isFormValid).toBeFalse();
  });

  it('should not be valid when noOfCopies is 0', () => {
    component.book.bookName = 'Livre';
    component.book.bookAuthor = 'Auteur';
    component.book.bookGenre = 'Genre';
    component.book.noOfCopies = 0;
    expect(component.isFormValid).toBeFalse();
  });

  it('should return validation errors for empty fields', () => {
    component.book.bookName = '';
    component.book.bookAuthor = '';
    component.book.bookGenre = '';
    component.book.noOfCopies = 0;
    const errors = component.validate();
    expect(errors.length).toBe(4);
  });

  it('should return empty validation array when valid', () => {
    component.book.bookName = 'Livre';
    component.book.bookAuthor = 'Auteur';
    component.book.bookGenre = 'Genre';
    component.book.noOfCopies = 2;
    const errors = component.validate();
    expect(errors.length).toBe(0);
  });

  it('should show error when submitting empty form', () => {
    component.book.bookName = '';
    component.book.bookAuthor = '';
    component.book.bookGenre = '';
    component.book.noOfCopies = 0;
    component.onSubmit();
    expect(component.errorMessage).toBeTruthy();
    expect(booksServiceSpy.createBook).not.toHaveBeenCalled();
  });

  it('should call createBook when form is valid', () => {
    booksServiceSpy.createBook.and.returnValue(of({}));
    component.book.bookName = 'Livre';
    component.book.bookAuthor = 'Auteur';
    component.book.bookGenre = 'Genre';
    component.book.noOfCopies = 3;
    component.onSubmit();
    expect(booksServiceSpy.createBook).toHaveBeenCalled();
  });

  it('should handle server error on createBook', () => {
    booksServiceSpy.createBook.and.returnValue(
      throwError(() => ({ status: 500, error: { message: 'Erreur serveur' } }))
    );
    component.book.bookName = 'Livre';
    component.book.bookAuthor = 'Auteur';
    component.book.bookGenre = 'Genre';
    component.book.noOfCopies = 3;
    component.onSubmit();
    expect(component.errorMessage).toContain('Erreur serveur');
  });

  it('should handle network error', () => {
    booksServiceSpy.createBook.and.returnValue(
      throwError(() => ({ status: 0 }))
    );
    component.book.bookName = 'Livre';
    component.book.bookAuthor = 'Auteur';
    component.book.bookGenre = 'Genre';
    component.book.noOfCopies = 3;
    component.onSubmit();
    expect(component.errorMessage).toContain('injoignable');
  });
});
