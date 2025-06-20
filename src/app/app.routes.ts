import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./login/login.module').then(m => m.LoginModule),  // Lazy-load LoginModule
  },
  {
    path: '',
    loadChildren: () => import('./login/login.module').then(m => m.LoginModule),  // Lazy-load LoginModule
  },
  {
    path: '',
    loadChildren: () => import('./admin-dashboard/admin-dashboard.module').then(m => m.AdminDashboarModule),
  },
  {
    path: '',
    loadChildren: () => import('./report/report.module').then(m => m.ReportModule),  // Lazy-load LoginModule
  },
  {
    path: '',
    loadChildren: () => import('./hotel-enrollment-tabview/hotel-enrollment-tabview.module').then(m => m.HotelEnrollmentTabviewModule),  // Lazy-load LoginModule
  },
  {
    path: '',
    loadChildren: () => import('./user-access/role/role.module').then(m => m.RoleModule),
  },
  {
    path: '',
    loadChildren: () => import('./user-access/role-listing/role-listing.module').then(m => m.RoleListingModule),
  },
  {
    path: '',
    loadChildren: () => import('./profile/profile.module').then(m => m.ProfileModule),  // Lazy-load LoginModule
  },
  {
    path: '',
    loadChildren: () => import('./settings/settings.module').then(m => m.SettingsModule),  // Lazy-load LoginModule
  },
  {
    path: '',
    loadChildren: () => import('./payment-subscription-management/payment-subscription-management.module').then(m => m.PaymentSubscriptionManagementModule),  // Lazy-load LoginModule
  },
  {
    path: '',
    loadChildren: () => import('./member-view/member-view.module').then(m => m.MemberViewModule),  // Lazy-load LoginModule
  },
  {
    path: '',
    loadChildren: () => import('./task-management/task-management.module').then(m => m.TaskManagementModule),
  },
  {
    path: '',
    loadChildren: () => import('./user-access/user/user.module').then(m => m.UserModule),  // Lazy-load LoginModule
  },
  {
    path: '',
    loadChildren: () => import('./user-access/user-listing/user-listing.module').then(m => m.UserListingModule),
  },
  {
    path: '',
    loadChildren: () => import('./task-management/timeline/timeline.module').then(m => m.TimelineModule),
  },
  {
    path: '',
    loadChildren: () => import('./user-access/staff/staff.module').then(m => m.StaffModule),
  },
  {
    path: '',
    loadChildren: () => import('./user-access/staff-listing/staff-listing.module').then(m => m.StaffListingModule),
  },
  {
    path: '',
    loadChildren: () => import('./hierarchy/hierarchy.module').then(m => m.HierarchyModule),
  },
  {
    path: '',
    loadChildren: () => import('./bookings/bookings.module').then(m => m.BookingsModule),
  },
  {
    path: '',
    loadChildren: () => import('./bookings-management/bookings-management.module').then(m => m.BookingsManagementModule),
  },
  {
    path: '',
    loadChildren: () => import('./late-checkout/late-checkout.module').then(m => m.LateCheckoutModule),
  }
];
