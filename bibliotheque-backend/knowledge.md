# Bibliotheque - Project Knowledge

## What This Project Is
A full-stack library management system (bibliothèque) built with Spring Boot (Java 17) and PostgreSQL. The backend provides a REST API for managing books and users with role-based access (Admin/User).

## Key Directories
- `src/main/java/com/ibizabroker/bibliotheque/` - Main application code
- `src/main/java/com/ibizabroker/bibliotheque/entity/` - JPA entities (Books, Users, Borrow, etc.)
- `src/main/java/com/ibizabroker/bibliotheque/dao/` - Repository interfaces (Spring Data JPA)
- `src/main/java/com/ibizabroker/bibliotheque/service/` - Business logic (JwtService)
- `src/main/java/com/ibizabroker/bibliotheque/util/` - Utilities (JwtUtil)
- `src/main/java/com/ibizabroker/bibliotheque/exceptions/` - Custom exceptions
- `src/main/resources/` - Configuration files

## Development Commands

### Build & Run
```bash
# Build the project
./mvnw clean install

# Run the application
./mvnw spring-boot:run

# Run tests
./mvnw test
```

### Docker (Full Stack)
```bash
# Start everything (backend + frontend + database)
docker compose up --build

# Access the app
# Frontend: http://localhost:4200
# Backend API: http://localhost:8080
```

## Database
- **PostgreSQL** (running on port 5432)
- Database: `bibliotheque`
- User: `bibliotheque`
- Credentials configured via `.env` file (see `.env.example`)

## Conventions & Patterns

### Code Style
- Java 17 with Spring Boot 2.7.18
- Lombok for boilerplate reduction
- Spring Data JPA for database access
- JWT-based authentication (jjwt library)

### Entity Structure
- Use Lombok annotations (`@Data`, `@NoArgsConstructor`, `@AllArgsConstructor`)
- JPA entities with proper relationships
- JSON serialization via `JsonDataSerializer`

### Security
- JWT tokens for authentication
- Role-based access: `ADMIN` and `USER` roles
- Default admin: `admin / admin123` (auto-created on first run)

### Testing
- Spring Boot Test with JUnit
- Spring Security Test available
- Test files in `src/test/java/`

## Gotchas

1. **Database Migration**: The app uses `spring.jpa.hibernate.ddl-auto=update`, which auto-creates/updates tables but doesn't handle complex migrations well.

2. **JWT Secret**: The JWT secret is hardcoded in `JwtUtil.java`. For production, use environment variables.

3. **CORS Configuration**: Ensure proper CORS settings if connecting from a different origin.

4. **Spring Boot Version**: Using 2.7.18 (compatible with JDK 17-21). Don't upgrade to 3.x without updating all dependencies.

5. **PostgreSQL vs MySQL**: The project was migrated from MySQL to PostgreSQL. Make sure all SQL is PostgreSQL-compatible.
