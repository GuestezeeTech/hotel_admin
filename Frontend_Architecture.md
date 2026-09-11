# Hotel Admin — Code Architecture

**Path:** `hotel_admin/hotel_admin`
**Stack:** Angular **18.2**, standalone bootstrap (`app.config.ts` + `app.routes.ts`), feature modules still use classic `NgModule` + `*-routing.module.ts`.
**Purpose:** Hotel-level admin console — single-property day-to-day operations.

## 1. Key Dependencies (`package.json`)

| Concern | Library |
|---|---|
| UI | Bootstrap 5.3.6, Bootstrap Icons, Font Awesome Free |
| Charts | Chart.js 4.4.9 + ng2-charts 8 |
| Realtime / Push | Firebase 9.23 + @angular/fire 7.6 (Firestore + FCM) |
| PWA | @angular/service-worker (auto-update via `SwUpdate`) |
| PDF | html2pdf.js |
| Misc | bcryptjs, crypto-js, js-base64 (local token encoding) |
| State mgmt | **None** (no NgRx/Akita) — service + RxJS `BehaviorSubject` + localStorage |
| Testing | Jasmine + Karma (Angular CLI defaults) |

## 2. `src/app/` Structure

Flat feature-folder layout — **no `core/` or `models/` directory**; ~40 feature folders sit directly under `app/`:

```
src/app/
├── app.component.ts/html/scss    (standalone root component)
├── app.config.ts                  (ApplicationConfig + monolithic ENDPOINTS map, 600+ lines)
├── app.routes.ts                  (top-level route table)
├── firestore-listener.service.ts
├── auth-services/                 (auth-token, local-storage, set-new-token)
├── services/                      (logout, payment-helper, permission, push)
├── shared/                        (alerts, header, menu-bar, loader, shared-data.service, constants)
├── login/
├── admin-dashboard/
├── hotel-list/
├── hotel-enrollment-tabview/       (+ cancellation, hierarchy-details, office-details,
│                                     property-details1, service-details, technical-info)
├── bookings/, bookings-management/, late-checkout/
├── task-management/                (+ asap-cart, cancelled, create-task, delivered,
│                                     escalated, escalated-from, processing, scheduled,
│                                     staff-delivered, staff-escalation, timeline)
├── user-access/                    (role, role-listing, staff, staff-listing, user, user-listing)
├── hierarchy/                      (hierarchy-list/-form/-view, hierarchy-customer-view)
├── Outlet/                         (outlet-creation, outlet-list)
├── product/
├── payment-details/, payment-subscription-management/
├── department-list/, service-settings/, service-tab-list/
├── features/, features-list/
├── guests/, member-view/, notification/, profile/, report/, restaurants-list/, settings/
└── privacy-policy/, terms-conditions/, not-found/
```

**Cleanup note:** several stray backup artifacts exist in source control and should be removed or excluded — `app/features(old)/`, `app/service-settings/service(old)/`, `app/hotel-enrollment-tabview/property-details1(before documents)/`, and zipped folders `Service Tab.zip`, `login(BEFORE OTP).zip`, `report(Before updating html).zip`, `shared/header(before payment).zip`.

## 3. Routing

- Root `app.routes.ts` wired via `provideRouter(routes)` in `app.config.ts`.
- **Every feature is lazy-loaded** (`loadChildren: () => import(...).then(m => m.XxxModule)`), each registered at `path: ''` — the actual URL segments are defined one level down inside each feature's own `*-routing.module.ts` (37 such files).
- Wildcard `**` → `NotFoundComponent` (eager).
- `restaurants-list` route exists but is **commented out**.
- **No `CanActivate` route guards registered anywhere.** Auth/redirect logic is instead handled imperatively in `app.component.ts`'s `router.events` subscription (see §7).

## 4. Major Feature Areas

| Area | Folder(s) |
|---|---|
| Auth | `login/` |
| Dashboard | `admin-dashboard/` (Chart.js) |
| Hotel onboarding wizard | `hotel-enrollment-tabview/` |
| Hotel listing | `hotel-list/` |
| Bookings | `bookings/`, `bookings-management/`, `late-checkout/` |
| Task/order pipeline | `task-management/` (asap-cart → processing → scheduled → delivered/cancelled/escalated) |
| RBAC / users | `user-access/` (role, staff, user + listings) |
| Org hierarchy | `hierarchy/` |
| Outlets | `Outlet/` |
| Products & services | `product/`, `department-list/`, `service-settings/`, `service-tab-list/`, `features/`, `features-list/` |
| Payments | `payment-details/`, `payment-subscription-management/` |
| Guests / members | `guests/`, `member-view/` |
| Notifications, profile, settings, reports | `notification/`, `profile/`, `settings/`, `report/` |
| Static/legal | `privacy-policy/`, `terms-conditions/`, `not-found/` |

## 5. Services Layer

- **Auth** (`auth-services/`): `auth-token.service.ts` (localStorage tokens, Base64-encoded, expiry checks), `local-storage.service.ts`, `set-new-token.service.ts` (refresh flow, redirects to `/login` on failure).
- **Cross-cutting** (`services/`): `logout.service.ts`, `payment-helper.service.ts`, `permission.service.ts` (RBAC checks from a `roleModules` array in localStorage), `push.service.ts` (Firebase Cloud Messaging).
- **Feature services** — one `*.service.ts` per feature folder (~30 files), each hand-rolling `HttpClient` calls with a manually attached `Authorization: Bearer <token>` header and a manual `isTokenExpired()` check before every call.
- **Shared UI**: `alerts.service.ts`, `loader.service.ts`, `shared-data.service.ts` (all `BehaviorSubject`-based).
- **Firestore**: `firestore-listener.service.ts` watches doc `authorities/1` for a `hitService` flag used as a cross-tab/service refresh signal.
- All API endpoints are centralized in a single ~600-line `ENDPOINTS` object in `app.config.ts`, built from four separate base URLs/ports (`API_URL`, `API_URL1`, `API_URL2`, `API_URL3`) — reflecting a microservices backend addressed directly by port per resource rather than through one API gateway.

## 6. Shared/Core Architecture

- **No guards, no interceptors** (`HTTP_INTERCEPTORS` unused anywhere) — auth headers and expiry checks are duplicated manually inside each service.
- **No dedicated `models/`/`interfaces/` folder** — most payloads are typed `any`; only `shared/alerts/alerts.model.ts` and inline interfaces in `permission.service.ts` exist.
- **Shared components** (`shared/`): `alerts/`, `header/`, `menu-bar/`, `loader/`, plus `constants/countries.ts`.
- **No custom pipes or directives** anywhere in the project.

## 7. State Management & Auth

- No NgRx/Akita/Signals — state lives in RxJS `BehaviorSubject`s inside services plus `localStorage`/`sessionStorage`.
- **Auth is enforced manually, not via Angular guards**: `app.component.ts` subscribes to `router.events` and checks `localStorage` (`UserId` + `loggedOut` flag) on every navigation, redirecting to `/login` when not authenticated. Each feature service independently checks token expiry before firing HTTP calls.
- `PermissionService` drives RBAC-based UI show/hide (`hasReadPermission`, `hasAddPermission`, `hasEditPermission`, `hasDeletePermission`) from a role-modules list cached in localStorage.

## 8. Environment & Integrations

- `src/environments/environment.ts` / `environment.prod.ts` — both currently point at the same `devURL: "https://www.guestezee.com"`, plus Firebase Web SDK config and an FCM VAPID key.
- **Firebase**: Firestore realtime listener + FCM push notifications, deeply wired into `app.component.ts` (token sync, staff/customer FCM token mirroring).
- **Charts**: Chart.js + ng2-charts in the dashboard.
- **PDF**: html2pdf.js (invoices/reports).
- **Payments**: HDFC payment gateway integrated entirely server-side (`ENDPOINTS.HDFC_PAYMENT`) — no client SDK.
- **OTP/SMS**: server-driven endpoints (`SEND_OTP`, `VERIFY_OTP`, etc.), no client SDK.
- **PWA**: `@angular/service-worker` auto-reloads the app on new deployments via `SwUpdate`.

## 9. How This Differs From `hotel_superadmin`

This app stays scoped to **one hotel's** day-to-day operations: bookings, task/order fulfillment, outlets, guests, and its own staff. It has no onboarding-of-other-hotels, no cross-tenant hierarchy management, and no subscription-selling functionality — those live in the separate `hotel_superadmin` console, which sits above this app as the multi-tenant back office.
