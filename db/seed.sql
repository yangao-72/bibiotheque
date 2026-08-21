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
INSERT INTO books (book_id, book_name, book_author, book_genre, no_of_copies)
SELECT 1, 'Le Petit Prince', 'Antoine de Saint-Exupéry', 'Conte', 5
WHERE NOT EXISTS (SELECT 1 FROM books WHERE book_id = 1);

INSERT INTO books (book_id, book_name, book_author, book_genre, no_of_copies)
SELECT 2, '1984', 'George Orwell', 'Science-fiction', 3
WHERE NOT EXISTS (SELECT 1 FROM books WHERE book_id = 2);

INSERT INTO books (book_id, book_name, book_author, book_genre, no_of_copies)
SELECT 3, 'L''Étranger', 'Albert Camus', 'Roman', 4
WHERE NOT EXISTS (SELECT 1 FROM books WHERE book_id = 3);

INSERT INTO books (book_id, book_name, book_author, book_genre, no_of_copies)
SELECT 4, 'Dune', 'Frank Herbert', 'Science-fiction', 2
WHERE NOT EXISTS (SELECT 1 FROM books WHERE book_id = 4);

-- Les identifiants AUTO de `books` et `users` passent par la séquence
-- hibernate_sequence créée par Hibernate : on l'avance au-delà des
-- identifiants posés à la main pour éviter toute collision. ------------------
SELECT setval('hibernate_sequence', 100, true)
WHERE EXISTS (SELECT 1 FROM pg_class WHERE relname = 'hibernate_sequence');
