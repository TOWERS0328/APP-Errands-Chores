import { TestBed } from '@angular/core/testing';

import { TimeOfDay } from './time-of-day';

describe('TimeOfDay', () => {
  let service: TimeOfDay;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TimeOfDay);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
