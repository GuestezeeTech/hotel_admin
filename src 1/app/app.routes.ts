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
  },
  {
    path: '',
    loadChildren: () => import('./Outlet/outlet-creation/outlet-creation.module').then(m => m.OutletCreationModule),
  },
  {
    path: '',
    loadChildren: () => import('./Outlet/outlet-list/outlet-list.module').then(m => m.OutletListModule),
  },
  {
    path: '',
    loadChildren: () => import('./product/product-detail.module').then(m => m.ProductDetailModule),
  },
  {
    path: '',
    loadChildren: () => import('./payment-details/payment-details.module').then(m => m.PaymentDetailsModule),
  },
  // Newly added for terms and conditions & privacy policy
  {
    path: '',
    loadChildren: () => import('./privacy-policy/privacy-policy.module').then(m => m.PrivacyPolicyModule),
  },
  {
    path: '',
    loadChildren: () => import('./terms-conditions/terms-conditions.module').then(m => m.TermsConditionsModule),
  },
  // Newly added for department list
  {
    path: '',
    loadChildren: () => import('./department-list/department-list.module').then(m => m.DepartmentListModule),
  },
  // Newly added for service settings
  {
    path: '',
    loadChildren: () => import('./service-settings/service-settings.module').then(m => m.ServiceSettingsModule),
  },
  {
    path: 'service-tab-list',
    loadChildren: () => import('./service-tab-list/service-tab-list.module').then(m => m.ServiceTabListModule)
  },
  {
    path: '',
    loadChildren: () => import('./features/features.module').then(m => m.FeaturesModule)
  },
  {
    path: '',
    loadChildren: () => import('./restaurants-list/restaurants-list.module').then(m => m.RestaurantsListModule)
  }
];
