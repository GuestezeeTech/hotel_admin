import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StaffDeliveredComponent } from './staff-delivered.component';

describe('StaffDeliveredComponent', () => {
  let component: StaffDeliveredComponent;
  let fixture: ComponentFixture<StaffDeliveredComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffDeliveredComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StaffDeliveredComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
