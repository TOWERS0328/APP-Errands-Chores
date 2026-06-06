import { TestBed } from '@angular/core/testing';

import { Celebration } from './celebration';

describe('Celebration', () => {
  let service: Celebration;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Celebration);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
