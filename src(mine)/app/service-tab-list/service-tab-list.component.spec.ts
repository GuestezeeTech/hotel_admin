import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ServiceTabListComponent } from './service-tab-list.component';

describe('ServiceTabListComponent', () => {
  let component: ServiceTabListComponent;
  let fixture: ComponentFixture<ServiceTabListComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceTabListComponent]
    })
    .compileComponents();
    fixture = TestBed.createComponent(ServiceTabListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
