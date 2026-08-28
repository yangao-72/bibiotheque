# =============================================================================
# Bibliothèque — API Spring Boot (port 8080)
# =============================================================================
# Spring Boot 2.7.18 + Java 17 (cf. pom.xml) : compatible avec les JDK 17-21.
# =============================================================================

# ---- Étape 1 : compilation -------------------------------------------------
FROM eclipse-temurin:17-jdk AS build
WORKDIR /app

# Le wrapper Maven (mvnw) télécharge Maven 3.9.9 puis les dépendances.
COPY mvnw ./
RUN chmod +x ./mvnw
COPY .mvn ./.mvn
COPY pom.xml .
RUN ./mvnw -q -B -DskipTests dependency:go-offline

COPY src ./src
RUN ./mvnw -q -B clean package -DskipTests

# ---- Étape 2 : exécution ---------------------------------------------------
FROM eclipse-temurin:17-jdk
WORKDIR /app

COPY --from=build /app/target/bibliotheque-0.0.1-SNAPSHOT.jar ./app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
