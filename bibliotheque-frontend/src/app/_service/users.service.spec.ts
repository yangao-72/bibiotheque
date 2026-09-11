import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { UsersService } from './users.service';
import { UserAuthService } from './user-auth.service';
import { TranslateModule } from '@ngx-translate/core';

describe('UsersService', () => {
  let service: UsersService;
  let userAuthService: UserAuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), HttpClientTestingModule]
    });
    service = TestBed.inject(UsersService);
    userAuthService = TestBed.inject(UserAuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('roleMatch', () => {

    function connecterAvecLesRoles(roleNames: string[]): void {
      spyOn(userAuthService, 'getRoles').and.returnValue(
        roleNames.map(roleName => ({ roleName })) as any
      );
    }

    it('should match when the single role is allowed', () => {
      connecterAvecLesRoles(['ADHERENT']);
      expect(service.roleMatch(['ADHERENT'])).toBeTrue();
    });

    it('should match a role that is not in first position', () => {
      // Un compte porte désormais plusieurs rôles : « Admin » puis « BIBLIOTHECAIRE ».
      connecterAvecLesRoles(['Admin', 'BIBLIOTHECAIRE']);
      expect(service.roleMatch(['BIBLIOTHECAIRE'])).toBeTrue();
    });

    it('should match when the allowed role is not in first position', () => {
      connecterAvecLesRoles(['User', 'ADHERENT']);
      expect(service.roleMatch(['BIBLIOTHECAIRE', 'ADHERENT'])).toBeTrue();
    });

    it('should not match when no role is allowed', () => {
      connecterAvecLesRoles(['User', 'ADHERENT']);
      expect(service.roleMatch(['BIBLIOTHECAIRE'])).toBeFalse();
    });

    it('should not match when the user has no role', () => {
      spyOn(userAuthService, 'getRoles').and.returnValue(null as any);
      expect(service.roleMatch(['ADHERENT'])).toBeFalse();
    });
  });
});
