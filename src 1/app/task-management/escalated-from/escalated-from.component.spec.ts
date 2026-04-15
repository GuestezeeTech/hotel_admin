import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EscalatedFromComponent } from './escalated-from.component';

describe('EscalatedFromComponent', () => {
  let component: EscalatedFromComponent;
  let fixture: ComponentFixture<EscalatedFromComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EscalatedFromComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EscalatedFromComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
