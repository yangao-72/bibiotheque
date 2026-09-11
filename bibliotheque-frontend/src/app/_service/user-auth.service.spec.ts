import { TestBed } from '@angular/core/testing';

import { UserAuthService } from './user-auth.service';
import { TranslateModule } from '@ngx-translate/core';

describe('UserAuthService', () => {
  let service: UserAuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      });
    service = TestBed.inject(UserAuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
