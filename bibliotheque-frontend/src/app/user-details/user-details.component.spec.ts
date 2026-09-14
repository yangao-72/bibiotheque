import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { UserDetailsComponent } from './user-details.component';
import { UsersService } from '../_service/users.service';
import { BorrowService } from '../_service/borrow.service';
import { ToastService } from '../_ui/toast/toast.service';
import { Users } from '../_model/users';

describe('UserDetailsComponent', () => {
  let component: UserDetailsComponent;
  let fixture: ComponentFixture<UserDetailsComponent>;
  let usersServiceSpy: jasmine.SpyObj<UsersService>;
  let borrowServiceSpy: jasmine.SpyObj<BorrowService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;

  /** Compte supprimé (soft delete) ou actif selon `actif`. */
  function buildUser(actif: boolean | undefined): Users {
    return {
      userId: 4,
      username: 'marie',
      name: 'Marie Durand',
      password: '',
      role: [{ roleName: 'ADHERENT' }],
      actif
    };
  }

  beforeEach(async () => {
    usersServiceSpy = jasmine.createSpyObj('UsersService', [
      'getUserById', 'reactivateUser', 'roleMatch'
    ]);
    borrowServiceSpy = jasmine.createSpyObj('BorrowService', ['getBooksBorrowedByUser']);
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'showText']);

    usersServiceSpy.getUserById.and.returnValue(of(buildUser(false)));
    usersServiceSpy.reactivateUser.and.returnValue(of(buildUser(true)));
    usersServiceSpy.roleMatch.and.returnValue(true);
    borrowServiceSpy.getBooksBorrowedByUser.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, TranslateModule.forRoot()],
      declarations: [UserDetailsComponent],
      providers: [
        { provide: UsersService, useValue: usersServiceSpy },
        { provide: BorrowService, useValue: borrowServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { params: { userId: 4 } } } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(UserDetailsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load the member and their loans from the route id', fakeAsync(() => {
    component.ngOnInit();
    tick();

    expect(component.id).toBe(4);
    expect(usersServiceSpy.getUserById).toHaveBeenCalledWith(4);
    expect(borrowServiceSpy.getBooksBorrowedByUser).toHaveBeenCalledWith(4);
    expect(component.loading).toBeFalse();
  }));

  // --- Statut du compte ----------------------------------------------------

  it('should treat a missing actif flag as an active account', fakeAsync(() => {
    // Compte créé avant le soft delete : le champ est absent de la réponse.
    usersServiceSpy.getUserById.and.returnValue(of(buildUser(undefined)));
    component.ngOnInit();
    tick();

    expect(component.estActif).toBeTrue();
  }));

  it('should report a deleted account as inactive', fakeAsync(() => {
    component.ngOnInit();
    tick();

    expect(component.estActif).toBeFalse();
  }));

  // --- Trace d'audit -------------------------------------------------------

  it('should show when and why a deleted account was removed', () => {
    usersServiceSpy.getUserById.and.returnValue(of({
      ...buildUser(false),
      dateDesactivation: '13-09-2026 19:40',
      motifDesactivation: 'Départ de l’établissement'
    }));

    fixture.detectChanges();

    const audit = fixture.nativeElement.querySelector('.audit-card');
    expect(audit).toBeTruthy();
    expect(audit.textContent).toContain('13-09-2026 19:40');
    expect(audit.textContent).toContain('Départ de l’établissement');
  });

  it('should hide the audit on an active account', () => {
    usersServiceSpy.getUserById.and.returnValue(of(buildUser(true)));

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.audit-card')).toBeNull();
  });

  // --- Réactivation --------------------------------------------------------

  it('should only offer reactivation to an admin', fakeAsync(() => {
    usersServiceSpy.roleMatch.and.returnValue(false);
    component.ngOnInit();
    tick();

    expect(usersServiceSpy.roleMatch).toHaveBeenCalledWith(['Admin']);
    expect(component.estAdmin).toBeFalse();
  }));

  it('should reactivate the account and refresh the card without leaving the page', fakeAsync(() => {
    component.ngOnInit();
    tick();

    component.reactiver();
    tick();

    expect(usersServiceSpy.reactivateUser).toHaveBeenCalledWith(4);
    expect(toastServiceSpy.success).toHaveBeenCalledWith('members.reactivated');
    expect(component.estActif).toBeTrue();
    expect(component.reactivating).toBeFalse();
  }));

  it('should not fire a second request while one is in flight', fakeAsync(() => {
    component.ngOnInit();
    tick();

    component.reactivating = true;
    component.reactiver();
    tick();

    expect(usersServiceSpy.reactivateUser).not.toHaveBeenCalled();
  }));

  it('should surface an error when reactivation fails', fakeAsync(() => {
    usersServiceSpy.reactivateUser.and.returnValue(
      throwError(() => ({ status: 403, error: { message: 'Action réservée à l’administrateur' } }))
    );
    component.ngOnInit();
    tick();

    component.reactiver();
    tick();

    expect(component.errorMessage).toBe('Action réservée à l’administrateur');
    expect(component.reactivating).toBeFalse();
  }));
});
