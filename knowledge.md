# Bibliotheque — Project Knowledge

## What This Project Is
A full-stack **library management system** (bibliothèque): Spring Boot REST API + Angular frontend + PostgreSQL. Two roles: **Admin** (CRUD books/users) and **User** (borrow/return). JWT auth with BCrypt passwords.

## Key Directories
| Path | Purpose |
|---|---|
| `bibliotheque-backend/` | Spring Boot API (port 8080) |
| `bibliotheque-frontend/` | Angular 14 app (port 4200) |
| `bibliotheque-backend/src/main/java/com/ibizabroker/bibliotheque/` | Backend Java source |
| `bibliotheque-backend/src/main/java/.../entity/` | JPA entities: Books, Users, Borrow, Role |
| `bibliotheque-backend/src/main/java/.../dao/` | Spring Data JPA repositories |
| `bibliotheque-backend/src/main/java/.../controller/` | REST controllers |
| `bibliotheque-backend/src/main/java/.../service/` | JwtService |
| `bibliotheque-backend/src/main/java/.../configuration/` | Security, CORS, JWT filter |
| `bibliotheque-backend/src/main/java/.../util/` | JwtUtil |
| `bibliotheque-frontend/src/app/` | Angular components, services, routing |
| `bibliotheque-frontend/src/app/_service/` | HTTP services (books, users, borrow) |
| `bibliotheque-frontend/src/app/_auth/` | AuthGuard, AuthInterceptor |
| `bibliotheque-frontend/src/app/_ui/` | Design-system components (illustration, toast, confirm, empty state, language switcher) |
| `bibliotheque-frontend/src/styles/` | Design tokens, base, motion, backgrounds, `ds-*` components |
| `bibliotheque-frontend/src/assets/i18n/` | `fr.json` / `en.json` translations |
| `design-system/` | Source of the gallery published to claude.ai/design |
| `db/seed.sql` | Initial data: admin account, test users, books, borrows |

## Commands

### Quick start (Docker)
```bash
docker compose up --build
# Frontend: http://localhost:4200
# Backend API: http://localhost:8080
# Login: admin / admin123
```

### Backend (manual)
```bash
cd bibliotheque-backend
./mvnw clean install              # build
./mvnw spring-boot:run            # run on port 8080
./mvnw test                       # 91 tests, H2 in memory, no DB needed
```

### Frontend (manual)
```bash
cd bibliotheque-frontend
npm install
npm start                         # serves on port 4200
npm run build                     # production build
npm test -- --watch=false --browsers=ChromeHeadless   # 195 tests
```

### Database
PostgreSQL, configured via `.env` (copy `.env.example`). Docker exposes on port 5433; direct connect uses 5432. Schema auto-created by Hibernate (`ddl-auto=update`). Seed data loaded by `db/seed.sql` via the `seed` Docker service.

## Architecture

### Backend (Spring Boot 2.7.18, Java 17)
- **Entities**: `Books`, `Users`, `Role`, `Borrow`, `JwtRequest`, `JwtResponse`
- **Repositories**: Spring Data JPA (`BooksRepository`, `UsersRepository`, `BorrowRepository`)
- **Controllers**: `BooksController` (`/admin/books`), `AdminController` (`/admin/users`), `BorrowController` (`/borrow`), `JwtController` (`/authenticate`)
- **Security**: JWT-based. `WebSecurityConfiguration` defines access rules — **only `/authenticate` and the Swagger paths are public**, everything else needs a token; methods are then gated by `@PreAuthorize`. `JwtRequestFilter` extracts tokens; `JwtAuthenticationEntryPoint` returns 401. CORS via `CorsConfiguration`.
- **Circular reference**: Code uses a circular dependency (jwtRequestFilter -> JwtService -> WebSecurityConfiguration -> jwtRequestFilter). Allowed via `spring.main.allow-circular-references=true`.

### Reservation security (RS-01..RS-05)
- **Roles**: `ADHERENT` and `BIBLIOTHECAIRE`, **added alongside** the legacy `User`/`Admin` roles (a user carries both). Seeded idempotently in `db/seed.sql`.
- **`ReservationSecurity`** (`configuration/`) is the single source of truth: `utilisateurCourantId()`, `estBibliothecaire()`, `estProprietaire()`. Exposed to SpEL as `@reservationSecurity`.
- **Identity always comes from the token**, never from the request body/params. RS-04 is enforced in `ReservationService.creerReservation` (not only in the controller, so a second caller cannot bypass it): for a non-librarian the owner is `ReservationSecurity.utilisateurCourantId(authentication)`. A member that targets **someone else's** id gets **403** (`ForbiddenException`, message `vous n'avez pas le droit`) — never a silent rewrite into a reservation under their own name, which would look like a success and hide the attempt. Repeating one's **own** id is accepted (the value decides nothing), and omitting the field stays valid. The member's frontend request omits the key outright (`createReservation` sends `{ livreId }`).
- **RS-05 uses the same rule and the same answer**: `ReservationService.listerReservations(statut, adherentId, authentication)` resolves the filter from the token, and a member that filters on **another** id gets 403 with that identical message instead of being silently shown their own rows. Passing one's own id is accepted; the librarian keeps filtering on anyone. The Angular list screen shows the server's message (it now wins over the generic HTTP-code key, as it already did for create/cancel), so a refused list reads `vous n'avez pas le droit` rather than "Accès interdit".
- **`@ResponseStatus` alone does not guarantee an error body.** Measured on the real app: 400/404/409 came back as Spring Boot's JSON (`…"message":"RG-01 : …"`), but a **403 came back empty** (`Content-Length: 0`). `GestionnaireExceptionsRest` (`@RestControllerAdvice`) now writes `{timestamp,status,error,message,path}` for the four business exceptions, so the message no longer depends on the container's error-page dispatch — and, since the body is already written, no error dispatch replaces it. 403s raised *before* the controller (Spring Security `@PreAuthorize`, missing token) stay empty on purpose; the Angular `AuthInterceptor` redirects those to `/forbidden`, but lets a 403 **carrying a message** through so the screen shows it (RS-04/RS-05's "vous n'avez pas le droit").
- `estProprietaire()` returns `true` for a missing reservation on purpose, so an unknown id yields 404 (from the service) rather than 403.
- Ownership check was **removed** from `ReservationService.annulerReservation` (it returned 409 and trusted a query param); it now lives in `@PreAuthorize` and returns 403.
- `JwtRequestFilter` catches `JwtException` so a forged token returns 401 instead of 500, and `UsernameNotFoundException` so a token whose subject was deleted also returns 401.
- **`POST /admin/users` had its `@PreAuthorize` commented out.** With `anyRequest().authenticated()`, any signed-in ADHERENT could mint themselves a BIBLIOTHECAIRE account and read every reservation — defeating RS-02/03/05 in three requests. Now restricted to `Admin` or `BIBLIOTHECAIRE`; `EscaladeDePrivilegesTests` locks it. **Closing the reservation endpoints is worthless while the account factory is open — check both when auditing.**
- `JwtService.loadUserByUsername` used `Optional.get()`, so the `if (user != null)` guard below it was dead code and the intended `UsernameNotFoundException` was unreachable. Fixed with `orElseThrow`.
- `DELETE /api/reservations/{id}` accepts `hasAnyRole('BIBLIOTHECAIRE', 'Admin')`: the seeded admin carries both roles, but an Admin-only account must also be able to purge a reservation. `SuppressionDeCompteTests`/`ReservationSecuriteTests` lock it.
- **`DELETE /admin/users/{id}`** (Admin only) removes a member by **soft delete**: `Users.actif` is set to `false` — the account can no longer sign in and leaves `GET /admin/users`, but its reservations and loans stay in the database, so history is preserved. It still refuses (409) a member holding an unreturned loan, and self-deletion. Mirrored in `users-list` with a delete button shown only to Admin.
- **Deactivation is audited**: `Users.dateDesactivation` (serialized `dd-MM-yyyy HH:mm` by `@JsonFormat` — day precision could not separate two same-day removals) and `Users.motifDesactivation` (500 chars) record when and why the account was removed. The motif is a **query param** on `DELETE /admin/users/{id}` (`?motif=…`) rather than a body, because many HTTP intermediaries strip a DELETE body. It is optional at the API level but **required by the UI**: the delete button opens the confirm dialog with a mandatory textarea. Reactivation clears both fields — they describe the current deactivation, not a log; real immutability would need an append-only audit table.
- **`PATCH /admin/users/{id}/reactiver`** (Admin) puts a soft-deleted account back in service; it is idempotent and preserves the roles/reservations that were never touched, so the member's previous token works again. `GET /admin/users` returns active accounts by default (`?inclureDesactives=true` for the archives view) — the default list is the one the librarian picks a member from, so a deleted member must not appear there. The members page is split into two views by a `ds-segmented` control: **Adhérents** (active) and **Archives** (deleted only; the view filter is applied client-side on `base`, computed in `refresh()`). Archives rows keep the details action — that is the way back to the profile, where `user-details` shows an Active/Deleted badge and the reactivate button — but have no delete action.
- **`Users.actif` is a nullable `Boolean`, and `estActif()` treats `null` as active.** `ddl-auto=update` adds the column with no default, so every pre-existing row reads `null`; a plain `boolean`/`actif = true` would lock every existing account out of the app. `UsersRepository.findAllActifs()` carries the same `is null or = true` condition. `JwtService.loadUserByUsername` rejects inactive accounts — the single choke point for both login and the JWT filter, so a token issued before deactivation stops working (401).

### Borrow security (`/borrow`)
- **The module used to be wide open**: `"/borrow/**"` sat in `WebSecurityConfiguration`'s `permitAll` and `BorrowController` carried **no** `@PreAuthorize`. Without a token, anyone could `POST /borrow` a copy for an arbitrary `userId` and `GET /borrow` the entire loan history of the library. `/admin/books/` was also in that `permitAll` list — a trailing-slash typo announcing a protection `BooksController`'s `@PreAuthorize` already provided. Both entries are gone.
- **`IdentiteCourante`** (`configuration/`, SpEL `@identiteCourante`) is now the single source of the caller's identity: `utilisateurCourant()`, `utilisateurCourantId()`, `aLeRole()` and `estPersonnel()` (Admin **or** BIBLIOTHECAIRE — the app adds reservation roles *beside* the legacy ones, so the seeded admin carries both). `ReservationSecurity` and `BorrowSecurity` both delegate to it: one mechanism, not one per module.
- **`BorrowSecurity`** adds `estProprietaire(borrowId, …)` (mirroring its reservation twin, and returning `true` for an unknown loan so the answer is 404 and not 403) plus `estUtilisateur(userId, …)`.
- **Matrix**: `POST /borrow` — self for a member, anyone for staff, and the body's `userId` is **overwritten from the token** for a non-staff caller (the same RS-04 rule as reservations); `PUT /borrow` — own loan, or any loan for staff; `GET /borrow` and `GET /borrow/book/{id}` — staff only (403 for a member); `GET /borrow/user/{id}` — self or staff.
- `DashboardComponent` already gated those two calls behind `isAdmin`, so closing them broke nothing — that guard is now **load-bearing**, not cosmetic. The borrow screens (`/borrow-book`, `/return-book`, `roles:['User']`) only touch self endpoints, so they keep working.
- `Optional.get()` in `borrowBook`/`returnBook` turned an unknown id into a 500; both now raise `NotFoundException` (404), and a null `userId`/`bookId` raises `BadRequestException` (400).
- `BorrowSecuriteTests` (23 cases) locks the anonymous 401s on all five endpoints, the member/staff matrix, the token-overrides-body rule, and the 404/400 edges.

### Known open issues (not fixed)
- `POST /authenticate` returns the whole `Users` entity, BCrypt hash included — it needs a response DTO.
- The JWT secret is hardcoded (gotcha 4) and `role` accumulates duplicate rows (gotcha 14).
- **A test fixture detail, not a product bug**: building a request body with `ObjectMapper` from an entity whose dates carry `@JsonSerialize(using = JsonDataSerializer.class)` fails — `dd-MM-yyyy` cannot be read back into a `Date`, so the request is rejected with 400 before reaching the controller. Write such bodies as raw JSON.

### Backend tests
- Profile `test` (`src/test/resources/application-test.properties`) switches the datasource to **H2 in memory** — `./mvnw test` needs no Docker and no PostgreSQL.
- `ReservationServiceRG03Tests` — pure unit test, Mockito mocks, no Spring context.
- `ReservationEndpointIntegrationTests` / `ReservationSecuriteTests` — full context + MockMvc + **real JWTs** (a `@WithMockUser` would bypass the JWT filter and could not prove RS-01). `ReservationSecuriteTests` carries one nested class per rule (RS-01…RS-05) plus an **IDOR probe** that walks a window of ids around another member's reservation and asserts that neither `GET` nor `PATCH /annuler` ever answers 200 — the direct answer to "can I just change 123 into 124?".
- Surefire 2.22.2 + `@Nested`: `-Dtest=ClassName` finds nothing; use `-Dtest='ClassName*'`.

### Design system & i18n (frontend)
- **Tokens** in `src/styles/tokens.css` — brand/neutral ramps, semantic colors, type & space scales, radii, elevations, motion, focus ring.
- **Palette is a single emerald green.** `--brand-500` = `#17804c`, picked for 4.97:1 against white text (AA body copy) so filled buttons need no darkening. Semantic "success" is deliberately a *different* green from the brand — otherwise "success" and "the app's colour" would be indistinguishable.
- **Dark theme is a re-assignment, not a dimming**: near-black with a green undertone (`#0b100e`); the brand lightens to `#35b174` (3.86:1 → 6.5:1 on dark; 3.86 fails AA body copy); elevation is carried by lightening the surface, not by shadows (a black shadow on a black ground is invisible).
- The sidebar follows the theme (it used to stay dark in both), and table headers are light (a dark band per table became unreadable in dark mode).
- The whole app was recoloured indigo → green by editing **only** `tokens.css`, after first converting 132 hardcoded hex values and 26 rgba literals in component stylesheets into token references. Keep it that way: a hardcoded colour breaks the next re-theme.
- Historical variable names (`--primary`, `--surface`, `--radius`…) are kept as aliases so the 23 legacy component stylesheets keep working. **Never rename them.**
- `src/styles/components.css` holds shared classes prefixed `ds-` — the prefix avoids collisions with Bootstrap and with legacy class names.
- Shared components in `src/app/_ui/`: `illustration` (7 inline SVGs), `toast` (+ `ToastService`), `confirm-dialog` (+ `ConfirmService`, replaces `window.confirm`; `ask()` is yes/no, `askWithInput()` adds a text field and resolves the trimmed text or `null` on cancel), `empty-state`, `language-switcher`.
- **Illustrations are inline SVG**, no binary assets, no CDN — the app renders identically offline and in Docker. Gradient ids are per-instance (`uid`) because two illustrations on one page would otherwise collide.
- Angular refuses interpolation in SVG attributes: use `[attr.fill]="'url(#' + uid + '-a)'"`, not `fill="url(#{{uid}}-a)"`.
- **i18n**: `@ngx-translate/core` v14 (Angular 14 — the project is NOT Angular 18 as previously documented). Files in `src/assets/i18n/{fr,en}.json`, loaded over HTTP, language persisted in localStorage, applied via `APP_INITIALIZER`.
- Server-side business messages (RG-01…RG-06) pass through the `translate` pipe unchanged — an unknown key is returned as-is. That is deliberate: client keys and server sentences coexist in the same field.
- Backend error messages remain French-only; translating them would require returning error codes instead of sentences.
- Every component spec needs `TranslateModule.forRoot()` in its TestBed, otherwise the `translate` pipe fails to resolve.
- **Shell visibility is route data, not hardcoded**: `AppComponent` reads `data.chrome` off the deepest route on each `NavigationEnd`. `/login` and `/home` set `chrome: false` — the two routes an unauthenticated visitor can reach, where the sidebar renders empty and the topbar's search is unusable. Keep **one** `router-outlet`: duplicating it across `ngIf/else` branches destroys and recreates the page component on every shell toggle.
- Hiding the topbar also hides the language switcher, so the login page mounts its own copy — otherwise a non-French visitor cannot switch language before signing in.

### Charts
- Two forms only, both **single-hue**: a column chart (7-day counts) and an arc meter (fulfilment rate). Components live in `_ui/bar-chart` and `_ui/arc-meter`.
- A status-breakdown stacked bar was **rejected**: the dataviz validator scores the status palette's adjacent pair green↔orange at ΔE 5.4 under protanopia, below the 6 floor that secondary encoding could rescue. Single-hue removes the problem by construction — don't reintroduce a multi-hue chart without re-running `scripts/validate_palette.js`.
- The meter fill **shortens the dash**, it never offsets it: a positive `stroke-dashoffset` shifts the pattern backwards and draws the *end* of the arc, filling the gauge in reverse.
- `rotate(135deg)` on the gauge SVG puts the opening at the bottom and starts the fill bottom-left. Verified by rendering all four rotations, not by reasoning.
- Bootstrap's colour utilities are re-pointed at tokens in `styles.css`: measured on our surfaces, `.text-muted`/`.text-success`/`.text-danger`/`.text-primary` land at 3.77–3.93:1 in dark mode (fail AA), and `.text-warning` is 1.63:1 in light mode.
- `.ds-segmented`'s active tab separated from its track by only 1.05:1 in dark mode; it is now marked by the brand colour plus an inset ring, not by a surface difference.
- Dates arrive from the server as `dd-MM-yyyy`; `new Date()` cannot parse that — the day-matching helper splits the string.

### Frontend (Angular 14)
- **20 components**: home, login, logout, header, forbidden, books-list, create-book, update-book, book-details, users-list, registration, update-user, user-details, borrow-book, return-book, dashboard, reservations, reservations-list, reservation-form, **reservation-details**
- **Reservation detail is a route, not a modal**: `/reservation-details/:reservationId` (`reservation-details/`), mirroring `book-details`/`user-details`, so a reservation is linkable by id. It calls `GET /api/reservations/{id}`, whose RS-03 check makes the API answer 403 for someone else's reservation — `AuthInterceptor` then redirects to `/forbidden`, so the screen never renders another member's data. The eye action in `reservations-list` emits a `details` event; the parent page owns the navigation.
- **Services**: `BooksService`, `UsersService`, `BorrowService`, `UserAuthService`
- **Auth**: `AuthGuard` (route protection by role), `AuthInterceptor` (adds Bearer token to all requests)
- **Routing**: Admin-only routes (`/books`, `/users`, CRUD), User-only (`/borrow-book`, `/return-book`), public (`/`, `/login`, `/forbidden`)
- **Hardcoded API URL**: `http://localhost:8080` is written in 3 service files (4 occurrences), not in `environment.ts`

### Data Flow
Browser → Angular component → Service → HTTP (with AuthInterceptor) → Backend Controller → Repository → Hibernate → PostgreSQL

## Conventions

### Backend
- Java 17, Spring Boot 2.7.18, Maven wrapper (`./mvnw`)
- Lombok for boilerplate (`@Data`, `@NoArgsConstructor`, `@AllArgsConstructor`)
- Spring Data JPA repositories (interfaces — implementations auto-generated)
- `spring.jpa.show-sql=true` is active — SQL visible in console
- Dates serialized as `dd-MM-yyyy` via `JsonDataSerializer`

### Frontend
- Angular 14 with TypeScript 4.7
- Bootstrap 5 for layout/grid; jQuery removed (was loaded globally, never used)
- Visual values come from CSS variables only — never hardcode a colour or spacing
- One component per folder (HTML + CSS + TS + spec)
- Services in `_service/`, auth in `_auth/`
- Testing: Karma + Jasmine

### Git
- Branch naming: `feat/...`, `epreuve/...`
- Commit messages: imperative mood, one subject per commit
- Never commit `node_modules/`, `target/`, `dist/`

## Gotchas

1. **Hardcoded API URL**: `http://localhost:8080` is hardcoded in `borrow.service.ts`, `users.service.ts`, and `books.service.ts` — not configurable via environment. In Docker, `localhost` refers to the browser's machine, not the container.
2. **Circular dependency**: `jwtRequestFilter` ↔ `JwtService` ↔ `WebSecurityConfiguration` form a cycle. Requires `spring.main.allow-circular-references=true`.
3. **Hibernate DDL**: Uses `ddl-auto=update` — auto-creates/updates tables but no rollback support. Don't use for complex migrations.
4. **JWT secret**: Hardcoded in `JwtUtil.java` — not externalized. Security risk for production.
5. **Spring Boot 2.7**: End of life. Upgrading to 3.x requires Jakarta namespace migration and other breaking changes.
6. **Docker DB port**: Exposed on host port **5433** (not 5432) to avoid conflicts. Direct PostgreSQL connections should use 5433.
7. **Seed data**: Admin password `admin123` is BCrypt-hashed. Test users (a1_adherent, a2_adherent, a3_emprunteur) and test books (L1-L5) with pre-populated borrows are seeded via `db/seed.sql`.
8. **Reservation roles must be seeded**: an account without `ADHERENT`/`BIBLIOTHECAIRE` gets **403** on `/api/reservations`. Re-run the seed (`docker compose up seed`) after pulling the security work — an **already-seeded volume does not pick up new grants**, so a stack that was seeded before the security work answers 403 on every reservation call while looking perfectly healthy (`admin` still works because its `BIBLIOTHECAIRE` grant predates it less visibly). Check with `select u.username, r.role_name from users u join user_role ur …`.
9. **`roleMatch` used to be broken**: it returned on the first iteration, so only the first role was ever tested. Fixed — mandatory now that accounts carry two roles.
10. **`/admin/users` is Admin-only**: the reservations page must not call `getUsersList()` for a plain ADHERENT, otherwise `AuthInterceptor` catches the 403 and redirects to `/forbidden`.
11. **Login redirect used `role[0]`**: with two roles per account and a Java `Set` (no ordering guarantee), the admin could land on the member page. Now scans the whole role list.
12. **Shared mock arrays leak between specs**: `ReservationsComponent` writes `reservation.statut` on cancel, so a module-level `const mockReservations` gets mutated. Build fixtures in `beforeEach`.
13. **jQuery was loaded globally but never used** — removed from `package.json` and `angular.json`.
14. **The seed's borrow rows belong to A2, not A3**: `db/seed.sql` announces « L2-L5 empruntés par A3 » but every `INSERT INTO borrow` uses `user_id = 3`, and user_id 3 is **A2** (A1 = 2, A2 = 3, A3 = 4). The scenario header is wrong and A3 holds no loan at all — anything reasoning about "the member holding books" must use A2.
15. **`role` accumulates duplicate rows**: `Users.role` is a `@ManyToMany(cascade = CascadeType.ALL)` and `Role.roleName` carries **no unique constraint**, so saving a user whose role objects are detached (`POST /admin/users` receives `"role":[{ "roleName": "ADHERENT" }]`) cascades a **persist and inserts a brand-new `role` row** on every signup. The demo database ended up with 14 rows for 4 names. Harmless *today* — `JwtService` dedupes authorities into a `HashSet` and `hasRole` compares the name — but `user_role` grows too (the seed's guard is per `role_id`, so each run links every account to each duplicate), and any future `role_id`-based rule would misbehave. Fix: `@Column(unique = true)` on `roleName`, resolve roles by name instead of cascading, then dedupe the existing rows.
