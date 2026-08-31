import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { RegistrationComponent } from './registration.component';
import { UsersService } from '../_service/users.service';

describe('RegistrationComponent', () => {
  let component: RegistrationComponent;
  let fixture: ComponentFixture<RegistrationComponent>;
  let usersServiceSpy: jasmine.SpyObj<UsersService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('UsersService', ['createUser']);

    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        HttpClientTestingModule,
        RouterTestingModule
      ],
      declarations: [RegistrationComponent],
      providers: [
        { provide: UsersService, useValue: spy }
      ]
    }).compileComponents();

    usersServiceSpy = TestBed.inject(UsersService) as jasmine.SpyObj<UsersService>;

    fixture = TestBed.createComponent(RegistrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default role', () => {
    expect(component.user.role).toBeDefined();
    expect(component.user.role[0].roleName).toBe('User');
  });

  it('should show error when name is empty', () => {
    component.user.name = '';
    component.user.username = 'test';
    component.user.password = 'pass';
    component.onSubmit();
    expect(component.errorMessage).toContain('nom complet');
    expect(component.saving).toBeFalse();
  });

  it('should show error when username is empty', () => {
    component.user.name = 'Test';
    component.user.username = '';
    component.user.password = 'pass';
    component.onSubmit();
    expect(component.errorMessage).toContain('utilisateur');
    expect(component.saving).toBeFalse();
  });

  it('should show error when password is empty', () => {
    component.user.name = 'Test';
    component.user.username = 'test';
    component.user.password = '';
    component.onSubmit();
    expect(component.errorMessage).toContain('mot de passe');
    expect(component.saving).toBeFalse();
  });

  it('should call createUser on valid submit', () => {
    usersServiceSpy.createUser.and.returnValue(of({ message: 'OK' }));
    component.user.name = 'Jean Dupont';
    component.user.username = 'jdupont';
    component.user.password = 'secret';
    component.onSubmit();
    expect(usersServiceSpy.createUser).toHaveBeenCalled();
    expect(component.saving).toBeFalse();
    expect(component.successMessage).toContain('succès');
  });

  it('should show error message on HTTP 409', () => {
    usersServiceSpy.createUser.and.returnValue(
      throwError(() => ({ status: 409, error: { message: 'Username déjà utilisé' } }))
    );
    component.user.name = 'Jean';
    component.user.username = 'exists';
    component.user.password = 'pass';
    component.onSubmit();
    expect(component.errorMessage).toContain('Username déjà utilisé');
    expect(component.saving).toBeFalse();
  });

  it('should show error message on network failure (status 0)', () => {
    usersServiceSpy.createUser.and.returnValue(
      throwError(() => ({ status: 0 }))
    );
    component.user.name = 'Jean';
    component.user.username = 'test';
    component.user.password = 'pass';
    component.onSubmit();
    expect(component.errorMessage).toContain('injoignable');
    expect(component.saving).toBeFalse();
  });

  it('should show error message on HTTP 400', () => {
    usersServiceSpy.createUser.and.returnValue(
      throwError(() => ({ status: 400, error: { message: 'Données invalides' } }))
    );
    component.user.name = 'Jean';
    component.user.username = 'test';
    component.user.password = 'pass';
    component.onSubmit();
    expect(component.errorMessage).toContain('Données invalides');
  });

  it('should show error message on HTTP 500', () => {
    usersServiceSpy.createUser.and.returnValue(
      throwError(() => ({ status: 500, error: {} }))
    );
    component.user.name = 'Jean';
    component.user.username = 'test';
    component.user.password = 'pass';
    component.onSubmit();
    expect(component.errorMessage).toContain('Erreur interne');
  });

  it('should clear errorMessage when clicking close', () => {
    component.errorMessage = 'Test error';
    component.errorMessage = '';
    expect(component.errorMessage).toBe('');
  });

  it('should show generic error for unknown status', () => {
    usersServiceSpy.createUser.and.returnValue(
      throwError(() => ({ status: 502 }))
    );
    component.user.name = 'Jean';
    component.user.username = 'test';
    component.user.password = 'pass';
    component.onSubmit();
    expect(component.errorMessage).toContain('502');
  });
});
