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
./mvnw test                       # 37 tests, H2 in memory, no DB needed
```

### Frontend (manual)
```bash
cd bibliotheque-frontend
npm install
npm start                         # serves on port 4200
npm run build                     # production build
npm test -- --watch=false --browsers=ChromeHeadless   # 148 tests
```

### Database
PostgreSQL, configured via `.env` (copy `.env.example`). Docker exposes on port 5433; direct connect uses 5432. Schema auto-created by Hibernate (`ddl-auto=update`). Seed data loaded by `db/seed.sql` via the `seed` Docker service.

## Architecture

### Backend (Spring Boot 2.7.18, Java 17)
- **Entities**: `Books`, `Users`, `Role`, `Borrow`, `JwtRequest`, `JwtResponse`
- **Repositories**: Spring Data JPA (`BooksRepository`, `UsersRepository`, `BorrowRepository`)
- **Controllers**: `BooksController` (`/admin/books`), `AdminController` (`/admin/users`), `BorrowController` (`/borrow`), `JwtController` (`/authenticate`)
- **Security**: JWT-based. `WebSecurityConfiguration` defines access rules; `JwtRequestFilter` extracts tokens; `JwtAuthenticationEntryPoint` returns 401. CORS via `CorsConfiguration`.
- **Circular reference**: Code uses a circular dependency (jwtRequestFilter -> JwtService -> WebSecurityConfiguration -> jwtRequestFilter). Allowed via `spring.main.allow-circular-references=true`.

### Reservation security (RS-01..RS-05)
- **Roles**: `ADHERENT` and `BIBLIOTHECAIRE`, **added alongside** the legacy `User`/`Admin` roles (a user carries both). Seeded idempotently in `db/seed.sql`.
- **`ReservationSecurity`** (`configuration/`) is the single source of truth: `utilisateurCourantId()`, `estBibliothecaire()`, `estProprietaire()`. Exposed to SpEL as `@reservationSecurity`.
- **Identity always comes from the token**, never from the request body/params. `ReservationController` overwrites `adherentId` (POST) and forces the `adherentId` filter (GET list) for non-librarians.
- `estProprietaire()` returns `true` for a missing reservation on purpose, so an unknown id yields 404 (from the service) rather than 403.
- Ownership check was **removed** from `ReservationService.annulerReservation` (it returned 409 and trusted a query param); it now lives in `@PreAuthorize` and returns 403.
- `JwtRequestFilter` catches `JwtException` so a forged token returns 401 instead of 500, and `UsernameNotFoundException` so a token whose subject was deleted also returns 401.
- **`POST /admin/users` had its `@PreAuthorize` commented out.** With `anyRequest().authenticated()`, any signed-in ADHERENT could mint themselves a BIBLIOTHECAIRE account and read every reservation — defeating RS-02/03/05 in three requests. Now restricted to `Admin` or `BIBLIOTHECAIRE`; `EscaladeDePrivilegesTests` locks it. **Closing the reservation endpoints is worthless while the account factory is open — check both when auditing.**
- `JwtService.loadUserByUsername` used `Optional.get()`, so the `if (user != null)` guard below it was dead code and the intended `UsernameNotFoundException` was unreachable. Fixed with `orElseThrow`.

### Backend tests
- Profile `test` (`src/test/resources/application-test.properties`) switches the datasource to **H2 in memory** — `./mvnw test` needs no Docker and no PostgreSQL.
- `ReservationServiceRG03Tests` — pure unit test, Mockito mocks, no Spring context.
- `ReservationEndpointIntegrationTests` / `ReservationSecuriteTests` — full context + MockMvc + **real JWTs** (a `@WithMockUser` would bypass the JWT filter and could not prove RS-01).
- Surefire 2.22.2 + `@Nested`: `-Dtest=ClassName` finds nothing; use `-Dtest='ClassName*'`.

### Design system & i18n (frontend)
- **Tokens** in `src/styles/tokens.css` — brand/neutral ramps, semantic colors, type & space scales, radii, elevations, motion, focus ring.
- **Palette is a single emerald green.** `--brand-500` = `#17804c`, picked for 4.97:1 against white text (AA body copy) so filled buttons need no darkening. Semantic "success" is deliberately a *different* green from the brand — otherwise "success" and "the app's colour" would be indistinguishable.
- **Dark theme is a re-assignment, not a dimming**: near-black with a green undertone (`#0b100e`); the brand lightens to `#35b174` (3.86:1 → 6.5:1 on dark; 3.86 fails AA body copy); elevation is carried by lightening the surface, not by shadows (a black shadow on a black ground is invisible).
- The sidebar follows the theme (it used to stay dark in both), and table headers are light (a dark band per table became unreadable in dark mode).
- The whole app was recoloured indigo → green by editing **only** `tokens.css`, after first converting 132 hardcoded hex values and 26 rgba literals in component stylesheets into token references. Keep it that way: a hardcoded colour breaks the next re-theme.
- Historical variable names (`--primary`, `--surface`, `--radius`…) are kept as aliases so the 23 legacy component stylesheets keep working. **Never rename them.**
- `src/styles/components.css` holds shared classes prefixed `ds-` — the prefix avoids collisions with Bootstrap and with legacy class names.
- Shared components in `src/app/_ui/`: `illustration` (7 inline SVGs), `toast` (+ `ToastService`), `confirm-dialog` (+ `ConfirmService`, replaces `window.confirm`), `empty-state`, `language-switcher`.
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
- **16 components**: home, login, logout, header, forbidden, books-list, create-book, update-book, book-details, users-list, registration, update-user, user-details, borrow-book, return-book
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
8. **Reservation roles must be seeded**: an account without `ADHERENT`/`BIBLIOTHECAIRE` gets **403** on `/api/reservations`. Re-run the seed (`docker compose up seed`) after pulling the security work.
9. **`roleMatch` used to be broken**: it returned on the first iteration, so only the first role was ever tested. Fixed — mandatory now that accounts carry two roles.
10. **`/admin/users` is Admin-only**: the reservations page must not call `getUsersList()` for a plain ADHERENT, otherwise `AuthInterceptor` catches the 403 and redirects to `/forbidden`.
11. **Login redirect used `role[0]`**: with two roles per account and a Java `Set` (no ordering guarantee), the admin could land on the member page. Now scans the whole role list.
12. **Shared mock arrays leak between specs**: `ReservationsComponent` writes `reservation.statut` on cancel, so a module-level `const mockReservations` gets mutated. Build fixtures in `beforeEach`.
13. **jQuery was loaded globally but never used** — removed from `package.json` and `angular.json`.
