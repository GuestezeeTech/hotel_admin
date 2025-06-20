import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EscalatedComponent } from './escalated.component';

describe('EscalatedComponent', () => {
  let component: EscalatedComponent;
  let fixture: ComponentFixture<EscalatedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EscalatedComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EscalatedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
