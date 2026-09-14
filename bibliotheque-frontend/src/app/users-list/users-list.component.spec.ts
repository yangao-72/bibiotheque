import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { UsersListComponent } from './users-list.component';
import { UsersService } from '../_service/users.service';
import { ToastService } from '../_ui/toast/toast.service';
import { ConfirmService } from '../_ui/confirm-dialog/confirm.service';
import { Users } from '../_model/users';

describe('UsersListComponent', () => {
  let component: UsersListComponent;
  let fixture: ComponentFixture<UsersListComponent>;
  let usersServiceSpy: jasmine.SpyObj<UsersService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;
  let confirmServiceSpy: jasmine.SpyObj<ConfirmService>;

  /**
   * Un compte actif et un compte supprimé, pour que les deux vues diffèrent.
   * Données neuves à chaque test : le composant les trie en place.
   */
  function buildUsers(): Users[] {
    return [
      { userId: 2, username: 'a1', name: 'Adhérent A1', password: '', role: [{ roleName: 'ADHERENT' }], actif: true },
      { userId: 3, username: 'a2', name: 'Adhérent A2', password: '', role: [{ roleName: 'ADHERENT' }], actif: false }
    ];
  }

  beforeEach(async () => {
    usersServiceSpy = jasmine.createSpyObj('UsersService', ['getUsersList', 'deleteUser', 'roleMatch']);
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'showText']);
    confirmServiceSpy = jasmine.createSpyObj('ConfirmService', ['ask', 'askWithInput']);

    usersServiceSpy.getUsersList.and.returnValue(of(buildUsers()));
    usersServiceSpy.deleteUser.and.returnValue(of(undefined));
    usersServiceSpy.roleMatch.and.returnValue(true);
    confirmServiceSpy.ask.and.returnValue(Promise.resolve(true));
    confirmServiceSpy.askWithInput.and.returnValue(Promise.resolve('Départ de l’établissement'));

    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), RouterTestingModule, FormsModule],
      declarations: [UsersListComponent],
      providers: [
        { provide: UsersService, useValue: usersServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        { provide: ConfirmService, useValue: confirmServiceSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(UsersListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load the members on init', fakeAsync(() => {
    component.ngOnInit();
    tick();

    expect(component.users.length).toBe(2);
    expect(component.loading).toBeFalse();
  }));

  it('should expose the deletion action only to an admin', fakeAsync(() => {
    usersServiceSpy.roleMatch.and.returnValue(false);
    component.ngOnInit();
    tick();

    expect(usersServiceSpy.roleMatch).toHaveBeenCalledWith(['Admin']);
    expect(component.estAdmin).toBeFalse();
  }));

  // --- Suppression ---------------------------------------------------------

  it('should ask for a mandatory reason before deleting a member', fakeAsync(() => {
    component.ngOnInit();
    tick();

    component.onDelete(component.users[0]);
    tick();

    // Le motif alimente la trace d'audit : il ne peut pas être facultatif.
    const request = confirmServiceSpy.askWithInput.calls.mostRecent().args[0];
    expect(request.inputRequired).toBeTrue();
    expect(request.inputLabelKey).toBe('members.deleteMotif');
  }));

  it('should delete a member with the reason and reload the list', fakeAsync(() => {
    component.ngOnInit();
    tick();

    component.onDelete(component.users[0]);
    tick();

    expect(usersServiceSpy.deleteUser).toHaveBeenCalledWith(2, 'Départ de l’établissement');
    expect(toastServiceSpy.success).toHaveBeenCalledWith('members.deleted');
    // La liste est rechargée après la suppression.
    expect(usersServiceSpy.getUsersList).toHaveBeenCalledTimes(2);
  }));

  it('should do nothing when the confirmation is declined', fakeAsync(() => {
    confirmServiceSpy.askWithInput.and.returnValue(Promise.resolve(null));

    component.onDelete(buildUsers()[0]);
    tick();

    expect(usersServiceSpy.deleteUser).not.toHaveBeenCalled();
  }));

  it('should surface the business message when deletion is refused', fakeAsync(() => {
    // 409 : l'adhérent a encore un emprunt en cours, le serveur rédige le message.
    usersServiceSpy.deleteUser.and.returnValue(
      throwError(() => ({ status: 409, error: { message: 'emprunt en cours' } }))
    );

    component.onDelete(buildUsers()[0]);
    tick();

    expect(toastServiceSpy.showText).toHaveBeenCalledWith('error', 'emprunt en cours');
  }));

  // --- Vues « Adhérents » / « Archives » -----------------------------------

  it('should only show active accounts by default', () => {
    fixture.detectChanges();

    expect(component.vue).toBe('actifs');
    expect(component.visible.length).toBe(1);
    expect(component.visible[0].username).toBe('a1');
  });

  it('should hold only deleted accounts in the archives view', () => {
    fixture.detectChanges();

    component.onChangeVue('archives');
    fixture.detectChanges();

    expect(usersServiceSpy.getUsersList).toHaveBeenCalledWith(true);
    expect(component.visible.length).toBe(1);
    expect(component.visible[0].username).toBe('a2');
  });

  it('should come back to the active accounts', () => {
    fixture.detectChanges();

    component.onChangeVue('archives');
    component.onChangeVue('actifs');
    fixture.detectChanges();

    expect(usersServiceSpy.getUsersList).toHaveBeenCalledWith(false);
    expect(component.visible.length).toBe(1);
    expect(component.visible[0].username).toBe('a1');
  });

  it('should clear the search when switching view', () => {
    fixture.detectChanges();
    component.onQueryChange('a2');

    component.onChangeVue('archives');

    expect(component.query).toBe('');
  });

  it('should show the archives empty state when nothing was deleted', () => {
    usersServiceSpy.getUsersList.and.returnValue(of([buildUsers()[0]]));
    fixture.detectChanges();

    component.onChangeVue('archives');
    fixture.detectChanges();

    expect(component.visible.length).toBe(0);
    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeTruthy();
  });

  it('should not offer deletion on an archived account', () => {
    fixture.detectChanges();

    component.onChangeVue('archives');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.user-delete')).toBeNull();
  });

  it('should still offer deletion on an active account', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.user-delete').length).toBe(1);
  });

  it('should treat a missing actif flag as an active account', () => {
    // Les comptes créés avant le soft delete n'ont pas le champ.
    const historique: Users = { userId: 9, username: 'vieux', name: 'Vieux Compte', password: '', role: [] };

    expect(component.estActif(historique)).toBeTrue();
  });

  it('should report a deactivated account as inactive', () => {
    expect(component.estActif(buildUsers()[1])).toBeFalse();
  });
});
