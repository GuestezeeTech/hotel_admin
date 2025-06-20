import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoleListingComponent } from './role-listing.component';

describe('RoleListingComponent', () => {
  let component: RoleListingComponent;
  let fixture: ComponentFixture<RoleListingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleListingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RoleListingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
