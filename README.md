<h1 align="center">
    <br>
    Bibliothèque
    <br>
</h1>

[![Spring Boot](https://img.shields.io/badge/Spring-6DB33F?style=for-the-badge&logo=spring&logoColor=white)]()
[![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)]()
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)]()
[![Hibernate](https://img.shields.io/badge/Hibernate-59666C?style=for-the-badge&logo=Hibernate&logoColor=white)]()
[![Maven](https://img.shields.io/badge/apache_maven-C71A36?style=for-the-badge&logo=apachemaven&logoColor=white)]()
[![Bootstrap](https://img.shields.io/badge/Bootstrap-563D7C?style=for-the-badge&logo=bootstrap&logoColor=white)]()

Application full-stack de gestion de bibliothèque : **Spring Boot** (API REST) +
**Angular** (interface) + **PostgreSQL** (persistance).

* Deux profils : **Admin** (CRUD livres et utilisateurs) et **User** (emprunter / rendre / réserver).
* Deux rôles pour le module réservation : **BIBLIOTHECAIRE** et **ADHERENT**.
* Authentification par **JWT**.
* Mots de passe chiffrés avec **BCrypt**.
* Redirection vers une page *forbidden* si le rôle n'a pas accès à l'URL.
* Module **Réservation** : création, liste filtrable par statut, annulation avec gestion des erreurs métier (409).
* API de réservation **fermée** : 401 sans token, 403 sans droit, identité issue du token (voir [section 7](#sécurité-des-réservations--rs-01--rs-05)).
* Interface **bilingue** français / anglais, bascule à chaud depuis la barre supérieure.
* **Design system BiblioGest** : palette verte monochrome, tokens, composants partagés, illustrations SVG, thème clair/sombre.

---

## Sommaire

1. [Prérequis](#1-prérequis)
2. [État du dépôt : ce qui marche, ce qui ne marche pas](#2-état-du-dépôt--ce-qui-marche-ce-qui-ne-marche-pas)
3. [Arborescence](#3-arborescence)
4. [Démarrer le projet](#4-démarrer-le-projet)
5. [Créer le premier compte](#5-créer-le-premier-compte)
6. [Le trajet d'une donnée : du clic à la base](#6-le-trajet-dune-donnée--du-clic-à-la-base)
7. [Les API](#7-les-api)
8. [Le design system et les langues](#8-le-design-system-et-les-langues)
9. [Rappel Git](#9-rappel-git)
10. [Captures d'écran](#10-captures-décran)

---

## 1. Prérequis

À installer **avant** la séance. Ne venez pas avec une machine vierge.

| Outil | Version | Vérifier avec |
|---|---|---|
| JDK | 17 ou + | `java -version` |
| Node.js | 20 ou + | `node -v` |
| npm | fourni avec Node | `npm -v` |
| Docker Desktop | à jour, **démarré** | `docker -v` puis `docker compose version` |
| Git | quelconque | `git --version` |
| IDE | IntelliJ IDEA / VS Code | — |

Si l'une de ces commandes ne répond pas, l'outil n'est pas dans votre `PATH` :
c'est à régler avant 8h30, pas pendant l'exercice.

---

## 2. État du dépôt : ce qui marche, ce qui ne marche pas

Ce dépôt est un projet **réel et daté**. Il ne se lance pas tout seul sur une
machine d'aujourd'hui. C'est volontaire : savoir démarrer un projet inconnu,
c'est d'abord savoir diagnostiquer pourquoi il refuse de démarrer.

### Ce qui est déjà là

* Un backend Spring Boot complet : entités, repositories, contrôleurs, sécurité JWT.
* Un frontend Angular complet : 18 composants, routage, guard, intercepteur HTTP.
* Aucune donnée : la base est vide au premier démarrage.

### Ce qui manque ou coince — c'est votre travail

| Constat | Détail |
|---|---|
| **Le backend ne compile pas sur un JDK 17+** | `pom.xml` cible Spring Boot 2.4.5 et Java 1.8. La version de Lombok qu'il embarque ne connaît pas le compilateur des JDK récents. Sur JDK 21, le build s'arrête sur `java.lang.NoSuchFieldError: Class com.sun.tools.javac.tree.JCTree$JCImport does not have member field 'com.sun.tools.javac.tree.JCTree qualid'`. |
| **Le frontend est en Angular 14** | `npx ng version` affiche `Node: 22.x (Unsupported)`. Le build passe malgré tout, mais vous êtes hors du support officiel. |
| **Aucun fichier Docker** | Pas de `Dockerfile`, pas de `docker-compose.yml`. La consigne « lancer avec `docker compose up` » suppose que vous les écriviez. |
| **La base doit exister à la main** | `application.properties` pointe sur `jdbc:mysql://localhost:3306/bibliotheque` avec `root` / `mysql`. Le schéma `bibliotheque` n'est créé par personne. |
| **Aucun compte de départ** | `POST /admin/users` est protégé : impossible de créer le premier administrateur via l'API. Voir la [section 5](#5-créer-le-premier-compte). |
| **L'URL de l'API est en dur** | `http://localhost:8080` est écrit dans les trois services Angular, pas dans `environment.ts`. |

> Ne « corrigez » rien avant qu'on en parle en séance : ces points sont les
> exercices, pas des bugs à masquer.

---

## 3. Arborescence

```
bibliothèque/
├── bibliotheque-backend/           API REST Spring Boot — port 8080
│   ├── pom.xml                     dépendances Maven + version de Java
│   ├── mvnw, mvnw.cmd              wrapper Maven (pas besoin d'installer Maven)
│   └── src/
│       ├── main/java/com/ibizabroker/bibliotheque/
│       │   ├── BibliothequeApplication.java   point d'entrée (main)
│       │   ├── entity/             les objets métier == les tables
│       │   │   ├── Books.java          un livre (+ borrowBook / returnBook)
│       │   │   ├── Users.java          un utilisateur, lié à des Role
│       │   │   ├── Role.java           "Admin" ou "User"
│       │   │   ├── Borrow.java         un emprunt (dates emprunt / retour)
│       │   │   ├── Reservation.java    une réservation (livre, adhérent, statut, dates)
│       │   │   ├── ReservationRequest.java   corps du POST /api/reservations
│       │   │   ├── ReservationResponse.java  réponse enrichie (noms livre/adhérent)
│       │   │   ├── ReservationStatus.java    enum : EN_ATTENTE, DISPONIBLE, ANNULEE, EXPIREE, HONOREE
│       │   │   ├── JwtRequest.java     corps du POST /authenticate
│       │   │   ├── JwtResponse.java    réponse : utilisateur + token
│       │   │   └── JsonDataSerializer.java  formate les dates en dd-MM-yyyy
│       │   ├── dao/                accès base — Spring Data JPA
│       │   │   ├── BooksRepository.java
│       │   │   ├── UsersRepository.java     findByUsername
│       │   │   ├── BorrowRepository.java    findByUserId, findByBookId
│       │   │   └── ReservationRepository.java  findByStatut, findByAdherentUserId
│       │   ├── controller/         les points d'entrée HTTP
│       │   │   ├── BooksController.java     /admin/books
│       │   │   ├── AdminController.java     /admin/users
│       │   │   ├── BorrowController.java    /borrow
│       │   │   ├── ReservationController.java  /api/reservations
│       │   │   └── JwtController.java       /authenticate
│       │   ├── service/
│       │   │   ├── JwtService.java     vérifie le couple login / mot de passe
│       │   │   └── ReservationService.java  logique métier réservation (RG-01 à RG-06, RS-04)
│       │   ├── configuration/
│       │   │   ├── WebSecurityConfiguration.java     qui a le droit d'aller où
│       │   │   ├── JwtRequestFilter.java             lit le header Authorization
│       │   │   ├── JwtAuthenticationEntryPoint.java  renvoie 401
│       │   │   ├── ReservationSecurity.java          identité du token + propriété (RS-03/04/05)
│       │   │   └── CorsConfiguration.java            autorise le front
│       │   ├── util/JwtUtil.java       fabrique et valide les tokens
│       │   └── exceptions/
│       │       ├── NotFoundException.java     -> HTTP 404
│       │       ├── BadRequestException.java   -> HTTP 400
│       │       └── ConflictException.java     -> HTTP 409
│       ├── main/resources/application.properties     port, URL base, identifiants
│       ├── test/resources/application-test.properties  profil `test` : base H2 en mémoire
│       └── test/java/...
│           ├── BibliothequeApplicationTests.java          le contexte démarre-t-il ?
│           ├── service/ReservationServiceRG03Tests.java   RG-03, unitaire, repositories mockés
│           ├── service/ReservationServiceRS04Tests.java   RS-04, unitaire, identité simulée
│           └── controller/
│               ├── ReservationEndpointIntegrationTests.java   GET /api/reservations : 401 / 200 / 403
│               ├── ReservationSecuriteTests.java            matrice réservation + RS-01 → RS-05
│               ├── BorrowSecuriteTests.java                 matrice /borrow
│               ├── EscaladeDePrivilegesTests.java           escalade de privilèges
│               └── SuppressionDeCompteTests.java            soft delete et audit des comptes
│
├── bibliotheque-frontend/          interface Angular — port 4200
│   ├── package.json                dépendances npm + scripts
│   ├── angular.json                configuration de build
│   └── src/
│       ├── index.html              la seule vraie page HTML
│       ├── main.ts                 démarre AppModule
│       ├── styles.css              imports du design system + pont Bootstrap
│       ├── styles/                 le design system
│       │   ├── tokens.css              couleurs, échelles, thème sombre
│       │   ├── base.css                réinitialisations, focus clavier
│       │   ├── motion.css              animations et courbes
│       │   ├── backgrounds.css         fonds décoratifs CSS/SVG
│       │   └── components.css          composants `ds-*`
│       ├── assets/i18n/            traductions
│       │   ├── fr.json
│       │   └── en.json
│       └── app/
│           ├── app.module.ts       déclare composants, services, intercepteur
│           ├── app-routing.module.ts   URL -> composant, + rôles autorisés
│           ├── _model/             les types TypeScript (books, users, borrow, reservation)
│           ├── _service/           les appels HTTP vers le backend
│           │   ├── books.service.ts      CRUD livres
│           │   ├── users.service.ts      CRUD utilisateurs + login
│           │   ├── borrow.service.ts     emprunts
│           │   ├── reservation.service.ts  réservations (CRUD + annulation)
│           │   └── user-auth.service.ts  token + rôles dans localStorage
│           ├── _auth/
│           │   ├── auth.guard.ts         bloque une route selon le rôle
│           │   └── auth.interceptor.ts   ajoute "Bearer <token>" partout
│           ├── _ui/                 composants du design system
│           │   ├── illustration/         7 illustrations SVG inline
│           │   ├── toast/                notifications flottantes + service
│           │   ├── confirm-dialog/       modale de confirmation + service
│           │   ├── empty-state/          état vide illustré
│           │   └── language-switcher/    bascule français / anglais
│           ├── reservations/          conteneur : état + appels API + filtre
│           ├── reservations-list/     tableau avec badges statut + bouton annuler
│           ├── reservation-form/      formulaire création (dropdowns livre/adhérent)
│           └── <autres composants>/   un dossier par écran (html / css / ts / spec)
│
├── design-system/                  sources des fiches publiées sur claude.ai/design
│   ├── foundations/                couleurs, typographie, espacement
│   ├── components/                 boutons, champs, badges, tableau, retours
│   └── patterns/                   illustrations, fonds, gabarit formulaire
├── screenshots/                    captures utilisées plus bas
├── SEANCE-1.md                     déroulé de la séance
└── EPREUVE-SEANCE-1.md             l'épreuve à rendre
```

**La règle à retenir** : côté backend, un dossier = une responsabilité
(`controller` reçoit, `service` décide, `dao` persiste, `entity` représente).
Côté frontend, un dossier = un écran, et tout ce qui parle au réseau vit dans
`_service`.

---

## 4. Démarrer le projet

### 4.1 La base de données

Le backend ne crée pas le schéma, seulement les tables. Il faut donc :

```sql
CREATE DATABASE bibliotheque;
```

Les identifiants attendus sont dans
[`application.properties`](bibliotheque-backend/src/main/resources/application.properties) :
utilisateur `root`, mot de passe `mysql`, port `3306`. Adaptez le fichier à
votre installation **ou** votre installation au fichier — mais sachez lequel
des deux vous avez fait.

### 4.2 Le backend

```bash
cd bibliotheque-backend
./mvnw spring-boot:run          # Windows : mvnw.cmd spring-boot:run
```

Au démarrage, `spring.jpa.hibernate.ddl-auto=update` demande à Hibernate de
créer les tables manquantes. Vérifiez-le tout de suite :

```sql
USE bibliotheque;
SHOW TABLES;
DESCRIBE books;
```

> Si Maven s'arrête sur `NoSuchFieldError ... JCTree$JCImport`, vous compilez
> avec un JDK trop récent pour ce projet.
> Voir la [section 2](#2-état-du-dépôt--ce-qui-marche-ce-qui-ne-marche-pas).

L'API écoute sur **http://localhost:8080**.

### 4.3 Le frontend

```bash
cd bibliotheque-frontend
npm install
npm start                       # équivaut à : ng serve
```

L'interface est sur **http://localhost:4200**. Elle appelle le backend sur le
port 8080 : les deux doivent tourner en même temps.

---

## 5. Créer le premier compte

Il n'y a aucun utilisateur en base, et `POST /admin/users` exige déjà un token.
Le premier administrateur s'insère donc directement en SQL, **après** le premier
démarrage du backend — sinon les tables n'existent pas encore.

Le mot de passe doit être un hachage **BCrypt** : `WebSecurityConfiguration`
déclare un `BCryptPasswordEncoder`, il n'acceptera jamais un mot de passe en
clair. Le hachage ci-dessous correspond à `admin123`.

```sql
USE bibliotheque;

-- 1. Regardez d'abord ce qu'Hibernate a réellement créé.
--    Les noms ci-dessous suivent la convention Spring Boot
--    (camelCase -> snake_case), mais vérifiez-les, ne les supposez pas.
SHOW TABLES;
DESCRIBE users;
DESCRIBE role;

-- 2. Puis insérez, en adaptant aux colonnes que DESCRIBE vous a montrées.
INSERT INTO role (role_name) VALUES ('Admin'), ('User');

INSERT INTO users (user_id, username, name, password)
VALUES (1, 'admin', 'Administrateur',
        '$2b$10$RN5ij7XXjDpRBALhITW.2uzYGontX4U9c9ZRH5i3e.5l6RvkjZ696');

INSERT INTO user_role (user_id, role_id)
VALUES (1, (SELECT role_id FROM role WHERE role_name = 'Admin'));

-- 3. Si une table hibernate_sequence existe, avancez son compteur au-delà
--    des identifiants que vous venez de poser à la main, sinon la prochaine
--    création depuis l'application entrera en collision.
UPDATE hibernate_sequence SET next_val = 100 WHERE next_val < 100;
```

Connexion : **admin / admin123**.

Vérification en ligne de commande, sans passer par le navigateur :

```bash
curl -X POST http://localhost:8080/authenticate \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"admin123"}'
```

Vous devez recevoir un JSON contenant `jwtToken`. Gardez-le : il sert pour tous
les autres appels.

```bash
curl http://localhost:8080/admin/users -H "Authorization: Bearer <le_token>"
```

---

## 6. Le trajet d'une donnée : du clic à la base

C'est l'objectif de la séance. Prenons **la création d'un livre** et suivons-la
couche par couche. Ouvrez les fichiers au fur et à mesure : ne lisez pas ce
tableau passivement.

| # | Où | Fichier | Ce qui se passe |
|---|---|---|---|
| 1 | Navigateur | [`create-book.component.html`](bibliotheque-frontend/src/app/create-book/create-book.component.html) | Vous remplissez le formulaire. `[(ngModel)]` recopie chaque champ dans l'objet `book` au fil de la frappe. |
| 2 | Navigateur | [`create-book.component.ts`](bibliotheque-frontend/src/app/create-book/create-book.component.ts) | Le clic déclenche `onSubmit()` → `saveBook()` → `booksService.createBook(this.book)`. |
| 3 | Navigateur | [`books.service.ts`](bibliotheque-frontend/src/app/_service/books.service.ts) | Traduit l'appel en `POST http://localhost:8080/admin/books`, objet sérialisé en JSON. |
| 4 | Navigateur | [`auth.interceptor.ts`](bibliotheque-frontend/src/app/_auth/auth.interceptor.ts) | **Toute** requête sortante passe ici : il ajoute l'en-tête `Authorization: Bearer <token>`. C'est lui aussi qui redirige vers `/login` sur un 401 et vers `/forbidden` sur un 403. |
| 5 | Réseau | — | La requête quitte le navigateur. Ouvrez l'onglet *Réseau* des DevTools : vous devez voir le POST, son corps et son en-tête. |
| 6 | Backend | [`CorsConfiguration.java`](bibliotheque-backend/src/main/java/com/ibizabroker/bibliotheque/configuration/CorsConfiguration.java) | Le port 4200 n'est pas le port 8080 : sans cette autorisation CORS, le navigateur refuserait la réponse. |
| 7 | Backend | [`JwtRequestFilter.java`](bibliotheque-backend/src/main/java/com/ibizabroker/bibliotheque/configuration/JwtRequestFilter.java) | Extrait le token du header, en tire le `username`, recharge l'utilisateur et le pose dans le `SecurityContext`. Filtre exécuté **avant** tout contrôleur. |
| 8 | Backend | [`WebSecurityConfiguration.java`](bibliotheque-backend/src/main/java/com/ibizabroker/bibliotheque/configuration/WebSecurityConfiguration.java) | Décide si la requête a le droit de continuer. Sans authentification valide → 401 émis par `JwtAuthenticationEntryPoint`. |
| 9 | Backend | [`BooksController.java`](bibliotheque-backend/src/main/java/com/ibizabroker/bibliotheque/controller/BooksController.java) | `@PostMapping("/books")` reçoit le JSON, `@RequestBody` le transforme en objet `Books`. `@PreAuthorize("hasRole('Admin')")` refuse si le rôle ne colle pas → 403. |
| 10 | Backend | [`BooksRepository.java`](bibliotheque-backend/src/main/java/com/ibizabroker/bibliotheque/dao/BooksRepository.java) | `save(book)`. L'interface est vide : Spring Data en génère l'implémentation au démarrage. |
| 11 | Backend | [`Books.java`](bibliotheque-backend/src/main/java/com/ibizabroker/bibliotheque/entity/Books.java) | `@Entity` / `@Table(name = "Books")` : c'est cette classe qui dit à Hibernate quelle table et quelles colonnes viser. |
| 12 | Base | MySQL | Hibernate émet l'`INSERT`. `spring.jpa.show-sql=true` l'affiche dans la console : lisez-le, c'est la preuve que le trajet est complet. |
| 13 | Retour | — | L'objet sauvegardé (avec son `bookId`) repart en JSON, le `subscribe()` de l'étape 2 se déclenche et route vers `/books`. |

Le même trajet vaut pour la lecture, la modification et la suppression : seuls
le verbe HTTP et la méthode du repository changent.

**Exercice de lecture** : refaites ce tableau, seul, pour l'emprunt d'un livre
(`borrow-book` → `BorrowController`). Vous y trouverez une différence notable :
le contrôleur y modifie **deux** tables.

---

## 7. Les API

Base : `http://localhost:8080`

### Authentification

`POST /authenticate` — accessible sans token, renvoie l'utilisateur et son JWT.

```json
{ "username": "admin", "password": "admin123" }
```

### Livres — `/admin/books`

| Verbe | URL | Rôle | Description |
|---|---|---|---|
| GET | `/admin/books` | — | Liste tous les livres |
| GET | `/admin/books/{id}` | Admin | Un livre par son id |
| POST | `/admin/books` | Admin | Crée un livre |
| PUT | `/admin/books/{id}` | Admin | Modifie un livre |
| DELETE | `/admin/books/{id}` | Admin | Supprime un livre |

```json
{
    "bookName": "Le Petit Prince",
    "bookAuthor": "Antoine de Saint-Exupéry",
    "bookGenre": "Conte",
    "noOfCopies": 5
}
```

### Utilisateurs — `/admin/users`

| Verbe | URL | Rôle | Description |
|---|---|---|---|
| GET | `/admin/users` | Admin | Liste les utilisateurs |
| GET | `/admin/users/{id}` | Admin | Un utilisateur par son id |
| POST | `/admin/users` | authentifié | Crée un utilisateur (le mot de passe est chiffré ici) |
| PUT | `/admin/users/{id}` | Admin | Modifie un utilisateur |

```json
{
    "username": "marie",
    "name": "Marie Dupont",
    "password": "motdepasse",
    "role": [ { "roleName": "User" } ]
}
```

### Emprunts — `/borrow`

| Verbe | URL | Description |
|---|---|---|
| GET | `/borrow` | Tous les emprunts |
| GET | `/borrow/user/{id}` | Les emprunts d'un utilisateur |
| GET | `/borrow/book/{id}` | L'historique d'un livre |
| POST | `/borrow` | Emprunter : décrémente `noOfCopies`, échéance à 7 jours |
| PUT | `/borrow` | Rendre : incrémente `noOfCopies`, pose la date de retour |

```json
{ "bookId": 3, "userId": 5 }
```

### Réservations — `/api/reservations`

**Tous ces endpoints exigent un token.** La matrice d'autorisations :

| Verbe | URL | Anonyme | ADHERENT | BIBLIOTHECAIRE |
|---|---|---|---|---|
| POST | `/api/reservations` | 401 | pour lui-même uniquement | pour n'importe qui |
| GET | `/api/reservations?statut=X&adherentId=X` | 401 | ses réservations seulement | toutes |
| GET | `/api/reservations/{id}` | 401 | si elle lui appartient, sinon 403 | toutes |
| PATCH | `/api/reservations/{id}/annuler` | 401 | si elle lui appartient, sinon 403 | toutes |
| DELETE | `/api/reservations/{id}` | 401 | **403** | oui |

```json
{ "livreId": 10, "adherentId": 11 }
```

> `adherentId` n'est lu que pour un **BIBLIOTHECAIRE**, qui réserve pour l'adhérent
> de son choix ; il est alors obligatoire (sinon **400**). Pour un ADHERENT, il est
> ignoré et remplacé par l'identité du token (RS-04).

**Règles de gestion :**
- RG-01 : On ne peut réserver qu'un livre indisponible (`noOfCopies == 0`)
- RG-02 : Une seule réservation active par livre et par adhérent
- RG-03 : Maximum 3 réservations actives simultanées
- RG-04 : Date d'expiration = date de réservation + 7 jours
- RG-05 : Annulation possible uniquement pour les statuts `EN_ATTENTE` ou `DISPONIBLE`
- RG-06 : Un statut `ANNULEE`, `EXPIREE` ou `HONOREE` ne peut plus changer

### Sécurité des réservations — RS-01 → RS-05

| Réf. | Règle | Où c'est implémenté |
|---|---|---|
| RS-01 | Sans token (absent, invalide, expiré) → **401** | `WebSecurityConfiguration` (`anyRequest().authenticated()`), `JwtRequestFilter`, `JwtAuthenticationEntryPoint` |
| RS-02 | Un ADHERENT sur une action bibliothécaire → **403** | `@PreAuthorize("hasRole('BIBLIOTHECAIRE')")` sur `DELETE` |
| RS-03 | Un ADHERENT sur la réservation d'un autre → **403** | `@PreAuthorize(... or @reservationSecurity.estProprietaire(#id, authentication))` |
| RS-04 | Un ADHERENT ne peut pas réserver au nom d'un autre | `ReservationService.creerReservation` : le propriétaire est déduit du token via `ReservationSecurity`, et l'`adherentId` du corps n'est lu que pour un BIBLIOTHECAIRE |
| RS-05 | `GET /api/reservations` par un ADHERENT ne renvoie que les siennes | `ReservationController.listerReservations` force le filtre `adherentId` |

### Ce que la matrice ne dit pas, et qui la vidait de son sens

Fermer les cinq endpoints de réservation ne suffit pas si le reste de
l'application permet de se fabriquer les droits qui les ouvrent. Une relecture
complète a mis au jour **deux incohérences** entre le code et la user story.

#### 1. La fabrique de comptes était ouverte (critique)

`POST /admin/users` avait son contrôle de rôle **commenté**. Comme la
configuration se contente de `anyRequest().authenticated()`, tout utilisateur
connecté pouvait l'appeler — y compris un simple ADHERENT. Le chemin d'attaque,
reproduit sur l'application réelle :

```
1. A1 se connecte            → token ADHERENT
2. POST /admin/users         → 200, avec role = BIBLIOTHECAIRE
3. Connexion au nouveau compte
4. GET /api/reservations     → toutes les réservations, de tous les adhérents
```

RS-02, RS-03 et RS-05 étaient donc contournables en trois requêtes. L'endpoint
est désormais réservé à `Admin` ou `BIBLIOTHECAIRE`, et cinq tests verrouillent
le chemin (`EscaladeDePrivilegesTests`).

#### 2. Un token orphelin renvoyait 500 au lieu de 401

`JwtService.loadUserByUsername` faisait `findByUsername(username).get()` sur un
`Optional`. Sur un résultat vide, cela lève `NoSuchElementException` — et le
`if (user != null)` qui suivait était du **code mort**, si bien que le
`UsernameNotFoundException` prévu n'était jamais atteint. Un token correctement
signé dont le porteur avait disparu de la base remontait donc en **500**, alors
que RS-01 exige **401** pour un token invalide.

Corrigé par un `orElseThrow`, et le filtre JWT intercepte désormais cette
exception pour laisser la requête finir en 401.

**401 vs 403** — la distinction est portée par Spring Security :
*401* = je ne sais pas qui vous êtes (aucune authentification valide) ;
*403* = je sais qui vous êtes, mais vous n'avez pas le droit.

Le cerveau de ces règles tient dans une seule classe :
[`ReservationSecurity.java`](bibliotheque-backend/src/main/java/com/ibizabroker/bibliotheque/configuration/ReservationSecurity.java).

### Les rôles

Les rôles `ADHERENT` et `BIBLIOTHECAIRE` **s'ajoutent** aux rôles historiques
`User` et `Admin` sans les remplacer : un compte porte les deux.

| Profil | Rôles en base | Peut |
|---|---|---|
| Administrateur | `Admin` + `BIBLIOTHECAIRE` | gérer livres/adhérents **et** toutes les réservations |
| Adhérent | `User` + `ADHERENT` | emprunter/rendre **et** gérer ses propres réservations |

Les comptes du jeu de données (`db/seed.sql`) reçoivent automatiquement leur
rôle réservation ; les comptes créés depuis l'écran d'inscription aussi.

### Lancer les tests

```bash
# Backend — 88 tests, aucune base requise (H2 en mémoire)
cd bibliotheque-backend && ./mvnw test

# Frontend — 192 tests
cd bibliotheque-frontend && npm test -- --watch=false --browsers=ChromeHeadless
```

| Classe de test | Ce qu'elle prouve |
|---|---|
| `ReservationServiceRG03Tests` | RG-03 en **test unitaire**, repositories mockés, sans base ni contexte Spring |
| `ReservationServiceRS04Tests` | RS-04 en **test unitaire** : le corps réclame un autre adhérent, le service enregistre pour le porteur du token et ne lit jamais le compte usurpé |
| `ReservationEndpointIntegrationTests` | `GET /api/reservations` : 401 sans token, 200 avec un token ADHERENT, 403 sur la réservation d'un autre |
| `ReservationSecuriteTests` | La matrice complète + RS-01 → RS-05, avec de vrais tokens JWT |
| `BorrowSecuriteTests` | La matrice `/borrow` : anonyme 401, ADHERENT restreint à ses emprunts, personnel autorisé |
| `EscaladeDePrivilegesTests` | Un ADHERENT ne peut pas se fabriquer de compte BIBLIOTHECAIRE ; un token orphelin donne 401 |
| `SuppressionDeCompteTests` | Soft delete des comptes, motif et date d'audit, réactivation, garde-fou « emprunt en cours » |

---

## 8. Le design system et les langues

### 8.1 Le design system

Toutes les valeurs visuelles (couleurs, espacements, typographie, élévations,
durées d'animation) vivent dans un seul endroit :

```
bibliotheque-frontend/src/styles/
├── tokens.css        les variables : rampes de couleur, échelles, thème sombre
├── base.css          réinitialisations, typographie de fond, focus clavier
├── motion.css        animations et courbes, neutralisées si l'OS le demande
├── backgrounds.css   fonds décoratifs générés en CSS/SVG
└── components.css    composants réutilisables, préfixés `ds-`
```

**La règle** : un composant ne code jamais une couleur ou un espacement en dur,
il consomme une variable. Changer `--brand-500` change toute l'application — c'est
exactement ce qui a permis de passer l'interface de l'indigo au vert en ne touchant
qu'au fichier de tokens, les 132 couleurs autrefois écrites en dur ayant d'abord
été converties en variables.

#### La couleur

Une seule couleur d'identité : un **vert émeraude**. Les autres teintes sont
réservées aux statuts (succès, alerte, erreur, information).

| Token | Valeur | Usage |
|---|---|---|
| `--brand-500` | `#17804c` | Ton d'identité. Contraste **4,97:1** avec du texte blanc → AA en texte courant, un bouton plein reste lisible sans assombrissement. |
| `--brand-600` / `--brand-800` | `#12693e` / `#0c4429` | Dégradés, survols, aplats de marque |
| `--brand-300` | `#6ebf99` | Ton de marque du **thème sombre** |

Le vert sémantique « succès » est volontairement distinct de la marque : sinon
« succès » et « couleur de l'application » se confondraient, et le statut ne
dirait plus rien.

Le texte se lit sur trois niveaux, **tous conformes AA** sur le fond le plus
clair de l'application :

| Token | Contraste sur `--canvas` |
|---|---|
| `--text-primary` | 13,6:1 |
| `--text-secondary` | 6,8:1 |
| `--text-muted` | 4,5:1 |

Le gris le plus clair de la rampe (`--neutral-400`, 2,6:1) est réservé aux
traits et aux icônes décoratives : **il ne porte jamais de texte**.

#### Le thème sombre

Ce n'est pas le thème clair assombri — les rôles des variables sont réattribués :

1. **Un noir légèrement vert** (`#0b100e`), pas un gris bleuté : sinon la marque
   verte se détache comme une pièce rapportée.
2. **La marque s'éclaircit.** `#17804c` sur le fond sombre ne donne que 3,86:1,
   sous le seuil AA de 4,5:1. Le thème sombre bascule sur `#35b174`, qui
   remonte à 6,5:1.
3. **L'élévation passe par la surface, pas par l'ombre.** Une ombre noire sur un
   fond noir ne se voit pas : chaque niveau (`--surface-sunken` → `--surface` →
   `--surface-raised`) s'éclaircit d'un cran.

La sidebar suit désormais le thème au lieu de rester sombre en permanence, et
les en-têtes de tableau sont clairs : un bandeau sombre en haut de chaque table
devenait illisible une fois le thème sombre activé.

Composants partagés (`src/app/_ui/`) :

| Composant | Rôle |
|---|---|
| `app-illustration` | 7 illustrations SVG inline, sans image binaire ni appel réseau |
| `app-toast-container` + `ToastService` | Notifications flottantes ; les erreurs ne s'effacent pas seules |
| `app-confirm-dialog` + `ConfirmService` | Remplace `window.confirm()` : traduisible, accessible, aux couleurs de l'app |
| `app-empty-state` | État vide illustré, avec l'action qui permet d'en sortir |
| `app-language-switcher` | Bascule de langue de la barre supérieure |
| `app-bar-chart` | Colonnes, série unique : recherche du survol, jumelle tabulaire |
| `app-arc-meter` | Jauge en arc — un ratio contre une limite |

#### Les graphiques

Deux formes seulement, toutes deux **monochromes**, sur la page Réservations :

| Graphique | Forme | Pourquoi |
|---|---|---|
| Réservations sur 7 jours | Colonnes, série unique | Magnitude dans le temps → une seule teinte, pas de légende |
| Taux d'aboutissement | Jauge (*meter*) | Un ratio contre une limite — *pas* un camembert à deux parts |

Le monochrome n'est pas un appauvrissement, c'est une contrainte mesurée. Une
répartition par statut en segments adjacents a été **écartée** : sous protanopie,
le vert « disponible » et l'orange « en attente » ne sont séparés que de ΔE 5,4,
sous le plancher de 6 qui rendrait la palette acceptable même avec étiquettes.
Une série unique par graphique fait disparaître le problème par construction.

Le taux d'aboutissement se calcule sur les seules réservations **terminées**
(honorées ÷ honorées + annulées + expirées) : le rapporter au total ferait
chuter le taux à chaque création, ce qui ne mesurerait rien.

Chaque graphique a une **jumelle tabulaire** : aucune valeur n'est accessible
uniquement au survol.

La galerie du design system est publiée sur **claude.ai/design** (projet
« BiblioGest — Design System ») : fondations, composants, motifs et illustrations.
Les sources des fiches sont dans [`design-system/`](design-system/).

#### Les écrans sans shell

La barre latérale et la barre du haut ne sont pas montées en dur : `AppComponent`
lit `data.chrome` sur la route la plus profonde à chaque navigation.

```ts
{ path: 'login', component: LoginComponent, data: { chrome: false } }
```

Deux routes en profitent — **`/login`** et **`/home`**. Ce sont les deux pages
qu'un visiteur non authentifié peut atteindre : la navigation n'y afficherait
qu'une barre latérale vide et une recherche inutilisable.

Deux détails qui comptent :

* **Un seul `router-outlet`.** Le dupliquer dans deux branches `ngIf/else`
  détruirait et recréerait le composant de page à chaque passage d'un écran
  avec shell à un écran sans. Le shell est masqué, le gabarit reçoit
  `.app-layout--bare` pour récupérer la largeur et la hauteur réservées.
* **Le sélecteur de langue est reposé sur l'écran de connexion.** Il vit
  normalement dans la barre du haut ; sans lui, un visiteur non francophone
  n'aurait aucun moyen de changer de langue avant de s'être connecté.

### 8.2 Les langues

L'interface est disponible en **français** (par défaut) et en **anglais**, avec
bascule à chaud — aucun rechargement, aucune URL différente.

```
bibliotheque-frontend/src/assets/i18n/
├── fr.json
└── en.json
```

* Technologie : `@ngx-translate/core`, chargement des fichiers via HTTP.
* Le choix est mémorisé dans le `localStorage` et survit à la déconnexion.
* À la première visite, la langue du navigateur est suivie si elle est supportée.
* L'attribut `lang` de la page suit la langue affichée (césure, synthèse vocale).

**Ajouter une langue** : créez `src/assets/i18n/<code>.json` à partir de `fr.json`,
puis ajoutez l'entrée dans `LanguageService.AVAILABLE`.

**Ajouter un texte** : ajoutez la clé dans **les deux** fichiers, puis utilisez
`{{ 'ma.cle' | translate }}` dans le template. Les messages métier renvoyés par le
serveur (RG-01…RG-06) traversent le pipe sans être modifiés : ils restent affichés
tels quels.

> ⚠️ Les messages d'erreur du **backend** sont rédigés en français dans le code Java.
> Les traduire supposerait de renvoyer des codes d'erreur plutôt que des phrases —
> ce n'est pas fait à ce stade.

### 8.3 Accessibilité

* Anneau de focus visible au clavier uniquement (`:focus-visible`).
* Lien d'évitement en première tabulation.
* Toutes les animations sont neutralisées sous `prefers-reduced-motion`.
* Les icônes décoratives sont `aria-hidden`, les boutons-icônes ont un `aria-label`.
* Le statut d'une réservation n'est jamais porté par la couleur seule : pastille + texte.
* Les utilitaires de couleur de Bootstrap (`.text-muted`, `.text-success`, `.text-danger`,
  `.text-primary`) sont rebranchés sur les tokens : mesurés sur nos surfaces, ils
  tombaient entre 3,77 et 3,93:1 en thème sombre, sous le seuil AA.

---

## 9. Rappel Git

Le cycle complet, dans l'ordre, à savoir refaire sans regarder :

```bash
# 1. Partir d'une base à jour
git checkout main
git pull

# 2. Une branche par sujet. Nommez-la pour qu'on devine son contenu.
git switch -c feat/nom-du-sujet

# 3. Travailler, puis regarder ce qu'on s'apprête à livrer
git status
git diff

# 4. Choisir ce qui entre dans le commit — pas de "git add ." aveugle
git add <fichiers>
git commit -m "feat: message à l'impératif, une ligne, ce qui change et pourquoi"

# 5. Publier la branche
git push -u origin feat/nom-du-sujet

# 6. Ouvrir la Pull Request sur GitHub, et y décrire :
#    ce que ça fait, comment le tester, ce qui reste à faire.
```

Quelques réflexes :

* `git log --oneline --graph --all` pour voir où vous en êtes.
* Un commit = un changement cohérent. Dix fichiers sans rapport dans un commit,
  c'est une revue impossible.
* On ne pousse jamais sur `main` directement.
* `node_modules/`, `target/` et `dist/` ne sont **jamais** commités : c'est le
  rôle des `.gitignore` du dépôt. Si `git status` vous les propose, quelque
  chose ne va pas.

---

## 10. Captures d'écran

### Accueil et connexion

![Page d'accueil](./screenshots/home.png "Page d'accueil")
![Page de connexion](./screenshots/login.png "Page de connexion")

### Côté administrateur

| Écran | Aperçu |
|---|---|
| Liste des livres | ![Liste des livres](./screenshots/book_list.png) |
| Ajout d'un livre | ![Ajout d'un livre](./screenshots/book_add.png) |
| Modification | ![Modification](./screenshots/book_update.png) |
| Historique d'un livre | ![Détail livre](./screenshots/book_details.png) |
| Liste des utilisateurs | ![Liste des utilisateurs](./screenshots/user_list.png) |
| Ajout d'un utilisateur | ![Ajout utilisateur](./screenshots/user_add.png) |
| Emprunts d'un utilisateur | ![Détail utilisateur](./screenshots/user_details.png) |
| Gestion des réservations | Filtre par statut, création, annulation avec gestion erreurs |

### Côté utilisateur

| Écran | Aperçu |
|---|---|
| Emprunter | ![Emprunter](./screenshots/borrow_book.png) |
| Rendre | ![Rendre](./screenshots/return_book.png) |
| Accès refusé | ![Forbidden](./screenshots/forbidden.png) |
