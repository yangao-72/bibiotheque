# Bibliotheque — Project Knowledge

## What This Project Is
A full-stack **library management system** (bibliothèque): Spring Boot REST API + Angular frontend + PostgreSQL. Two roles: **Admin** (CRUD books/users) and **User** (borrow/return). JWT auth with BCrypt passwords.

## Key Directories
| Path | Purpose |
|---|---|
| `bibliotheque-backend/` | Spring Boot API (port 8080) |
| `bibliotheque-frontend/` | Angular 18 app (port 4200) |
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
./mvnw test                       # tests (1 context test)
```

### Frontend (manual)
```bash
cd bibliotheque-frontend
npm install
npm start                         # serves on port 4200
npm run build                     # production build
npm test                          # Karma/Jasmine tests
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
- `JwtRequestFilter` catches `JwtException` so a forged token returns 401 instead of 500.

### Backend tests
- Profile `test` (`src/test/resources/application-test.properties`) switches the datasource to **H2 in memory** — `./mvnw test` needs no Docker and no PostgreSQL.
- `ReservationServiceRG03Tests` — pure unit test, Mockito mocks, no Spring context.
- `ReservationEndpointIntegrationTests` / `ReservationSecuriteTests` — full context + MockMvc + **real JWTs** (a `@WithMockUser` would bypass the JWT filter and could not prove RS-01).
- Surefire 2.22.2 + `@Nested`: `-Dtest=ClassName` finds nothing; use `-Dtest='ClassName*'`.

### Frontend (Angular 18)
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
- Angular 18 with TypeScript 5.4
- Bootstrap 5 for styling, jQuery included
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
