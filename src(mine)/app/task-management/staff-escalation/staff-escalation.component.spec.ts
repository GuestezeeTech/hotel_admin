import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StaffEscalatedComponent } from './staff-escalation.component';

describe('StaffEscalatedComponent', () => {
  let component: StaffEscalatedComponent;
  let fixture: ComponentFixture<StaffEscalatedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffEscalatedComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StaffEscalatedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
