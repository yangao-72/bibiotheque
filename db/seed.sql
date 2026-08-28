-- =============================================================================
-- Données initiales : rôles, compte administrateur et quelques livres.
-- Idempotent : chaque instruction ne fait rien si la donnée existe déjà,
-- le service `seed` de docker-compose peut donc être relancé sans risque.
--
-- Le mot de passe est un hachage BCrypt de "admin123" (cf. README).
-- =============================================================================

-- Rôles ----------------------------------------------------------------------
INSERT INTO role (role_name)
SELECT 'Admin'
WHERE NOT EXISTS (SELECT 1 FROM role WHERE role_name = 'Admin');

INSERT INTO role (role_name)
SELECT 'User'
WHERE NOT EXISTS (SELECT 1 FROM role WHERE role_name = 'User');

-- Compte administrateur --------------------------------------------------------
INSERT INTO users (user_id, username, name, password)
SELECT 1, 'admin', 'Administrateur',
       '$2b$10$RN5ij7XXjDpRBALhITW.2uzYGontX4U9c9ZRH5i3e.5l6RvkjZ696'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

INSERT INTO user_role (user_id, role_id)
SELECT 1, r.role_id
FROM role r
WHERE r.role_name = 'Admin'
  AND NOT EXISTS (
      SELECT 1 FROM user_role ur
      WHERE ur.user_id = 1 AND ur.role_id = r.role_id
  );

-- Livres ------------------------------------------------------------------------
--INSERT INTO books (book_id, book_name, book_author, book_genre, no_of_copies)
--SELECT 1, 'Le Petit Prince', 'Antoine de Saint-Exupéry', 'Conte', 5
--WHERE NOT EXISTS (SELECT 1 FROM books WHERE book_id = 1);

--INSERT INTO books (book_id, book_name, book_author, book_genre, no_of_copies)
--SELECT 2, '1984', 'George Orwell', 'Science-fiction', 3
--WHERE NOT EXISTS (SELECT 1 FROM books WHERE book_id = 2);

--INSERT INTO books (book_id, book_name, book_author, book_genre, no_of_copies)
--SELECT 3, 'L''Étranger', 'Albert Camus', 'Roman', 4
--WHERE NOT EXISTS (SELECT 1 FROM books WHERE book_id = 3);

--INSERT INTO books (book_id, book_name, book_author, book_genre, no_of_copies)
--SELECT 4, 'Dune', 'Frank Herbert', 'Science-fiction', 2
--WHERE NOT EXISTS (SELECT 1 FROM books WHERE book_id = 4);

-- ==========================================================================
-- Données de test — Scénario L1-L5 / A1-A3
-- --------------------------------------------------------------------------
-- L1  : livre disponible, aucun emprunt
-- L2-L5 : livres empruntés (non rendus) par A3
-- A1  : adhérent principal
-- A2  : adhérent pour test saturation quota réservations
-- A3  : emprunteur (détient L2, L3, L4, L5)
--
-- Chaque livre a 1 copie ; après emprunt, no_of_copies passe à 0.
-- Un emprunt non rendu = ligne dans `borrow` avec return_date IS NULL.
-- ==========================================================================

-- --- Utilisateurs de test (A1, A2, A3) -------------------------------------
INSERT INTO users (user_id, username, name, password)
SELECT 2, 'A1', 'Adhérent principal',
       '$2b$10$RN5ij7XXjDpRBALhITW.2uzYGontX4U9c9ZRH5i3e.5l6RvkjZ696'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'A1');

INSERT INTO users (user_id, username, name, password)
SELECT 3, 'A2', 'Adhérent saturation',
       '$2b$10$RN5ij7XXjDpRBALhITW.2uzYGontX4U9c9ZRH5i3e.5l6RvkjZ696'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'A2');

INSERT INTO users (user_id, username, name, password)
SELECT 4, 'A3', 'Emprunteur (A3)',
       '$2b$10$RN5ij7XXjDpRBALhITW.2uzYGontX4U9c9ZRH5i3e.5l6RvkjZ696'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'A3');

-- Rôle User pour A1, A2, A3
INSERT INTO user_role (user_id, role_id)
SELECT 2, r.role_id FROM role r WHERE r.role_name = 'User'
  AND NOT EXISTS (SELECT 1 FROM user_role WHERE user_id = 2 AND role_id = r.role_id);

INSERT INTO user_role (user_id, role_id)
SELECT 3, r.role_id FROM role r WHERE r.role_name = 'User'
  AND NOT EXISTS (SELECT 1 FROM user_role WHERE user_id = 3 AND role_id = r.role_id);

INSERT INTO user_role (user_id, role_id)
SELECT 4, r.role_id FROM role r WHERE r.role_name = 'User'
  AND NOT EXISTS (SELECT 1 FROM user_role WHERE user_id = 4 AND role_id = r.role_id);

-- --- Livres de test (L1 à L5) ----------------------------------------------
-- L1 : disponible, 1 copie, aucun emprunt
INSERT INTO books (book_id, book_name, book_author, book_genre, no_of_copies)
SELECT 1, 'L1', 'jefferson1', 'roman', 1
WHERE NOT EXISTS (SELECT 1 FROM books WHERE book_id = 1);

-- L2 : emprunté par A3
INSERT INTO books (book_id, book_name, book_author, book_genre, no_of_copies)
SELECT 2, 'L2', 'jefferson2', 'roman', 1
WHERE NOT EXISTS (SELECT 1 FROM books WHERE book_id = 2);

-- L3 : emprunté par A3
INSERT INTO books (book_id, book_name, book_author, book_genre, no_of_copies)
SELECT 3, 'L3', 'jefferson3', 'roman', 1
WHERE NOT EXISTS (SELECT 1 FROM books WHERE book_id = 3);

-- L4 : emprunté par A3
INSERT INTO books (book_id, book_name, book_author, book_genre, no_of_copies)
SELECT 4, 'L4', 'jefferson4', 'roman', 1
WHERE NOT EXISTS (SELECT 1 FROM books WHERE book_id = 4);

-- L5 : emprunté par A3
INSERT INTO books (book_id, book_name, book_author, book_genre, no_of_copies)
SELECT 5, 'L5', 'jefferson5', 'roman', 1
WHERE NOT EXISTS (SELECT 1 FROM books WHERE book_id = 5);

-- --- Emprunts de A3 sur L2, L3, L4, L5 (non rendus) ------------------------
-- On simule un emprunt : issue_date = maintenant, due_date = +7 jours,
-- return_date = NULL (= non rendu)
-- Après chaque emprunt, no_of_copies du livre passe de 1 à 0.
-- L1 reste disponible (no_of_copies = 1), L5 est emprunté (no_of_copies = 0).
INSERT INTO borrow (book_id, user_id, issue_date, due_date, return_date)
SELECT 2, 3, NOW(), NOW() + INTERVAL '7 days', NULL
WHERE NOT EXISTS (SELECT 1 FROM borrow WHERE book_id = 2 AND user_id = 3 AND return_date IS NULL);

INSERT INTO borrow (book_id, user_id, issue_date, due_date, return_date)
SELECT 3, 3, NOW(), NOW() + INTERVAL '7 days', NULL
WHERE NOT EXISTS (SELECT 1 FROM borrow WHERE book_id = 3 AND user_id = 3 AND return_date IS NULL);

INSERT INTO borrow (book_id, user_id, issue_date, due_date, return_date)
SELECT 4, 3, NOW(), NOW() + INTERVAL '7 days', NULL
WHERE NOT EXISTS (SELECT 1 FROM borrow WHERE book_id = 4 AND user_id = 3 AND return_date IS NULL);

INSERT INTO borrow (book_id, user_id, issue_date, due_date, return_date)
SELECT 5, 3, NOW(), NOW() + INTERVAL '7 days', NULL
WHERE NOT EXISTS (SELECT 1 FROM borrow WHERE book_id = 5 AND user_id = 3 AND return_date IS NULL);

-- Mise à jour de no_of_copies pour les livres empruntés (1 → 0)
-- L1 reste à 1 (disponible), L2-L5 passent à 0 (indisponibles)
UPDATE books SET no_of_copies = 0 WHERE book_id IN (2, 3, 4, 5)
  AND no_of_copies > 0;

-- ==========================================================================
-- Séquence Hibernate
-- Les identifiants AUTO de `books` et `users` passent par la séquence
-- hibernate_sequence créée par Hibernate : on l'avance au-delà des
-- identifiants posés à la main pour éviter toute collision.
-- ==========================================================================
SELECT setval('hibernate_sequence', 200, true)
WHERE EXISTS (SELECT 1 FROM pg_class WHERE relname = 'hibernate_sequence');
