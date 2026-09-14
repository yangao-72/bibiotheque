package com.ibizabroker.bibliotheque.controller;

import com.ibizabroker.bibliotheque.configuration.BorrowSecurity;
import com.ibizabroker.bibliotheque.dao.BooksRepository;
import com.ibizabroker.bibliotheque.dao.BorrowRepository;
import com.ibizabroker.bibliotheque.dao.UsersRepository;
import com.ibizabroker.bibliotheque.entity.Books;
import com.ibizabroker.bibliotheque.entity.Borrow;
import com.ibizabroker.bibliotheque.entity.Users;
import com.ibizabroker.bibliotheque.exceptions.BadRequestException;
import com.ibizabroker.bibliotheque.exceptions.NotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Calendar;
import java.util.Date;
import java.util.List;

/**
 * Emprunts et retours.
 *
 * <p>Ce contrôleur était <b>entièrement ouvert</b> : {@code /borrow/**} figurait
 * dans les {@code permitAll} de {@code WebSecurityConfiguration} et aucune méthode
 * ne portait de {@code @PreAuthorize}. Sans token, on pouvait donc emprunter un
 * exemplaire au nom d'un {@code userId} arbitraire et lire l'historique de toute
 * la bibliothèque. La matrice appliquée ici est la suivante :</p>
 *
 * <table border="1">
 *   <caption>Autorisations du module emprunt</caption>
 *   <tr><th>Endpoint</th><th>ADHERENT / User</th><th>BIBLIOTHECAIRE / Admin</th></tr>
 *   <tr><td>{@code POST /borrow}</td><td>pour lui-même uniquement</td><td>pour n'importe qui</td></tr>
 *   <tr><td>{@code PUT /borrow}</td><td>son propre emprunt</td><td>n'importe lequel</td></tr>
 *   <tr><td>{@code GET /borrow}</td><td>403</td><td>tous les emprunts</td></tr>
 *   <tr><td>{@code GET /borrow/user/{id}}</td><td>le sien</td><td>n'importe qui</td></tr>
 *   <tr><td>{@code GET /borrow/book/{id}}</td><td>403</td><td>l'historique du livre</td></tr>
 * </table>
 *
 * <p>Même règle que RS-04 pour les réservations : le {@code userId} envoyé par le
 * client est ignoré pour un adhérent, l'emprunteur est le porteur du token.</p>
 */
@RestController
@RequestMapping("/borrow")
public class BorrowController {

    @Autowired
    private BorrowRepository borrowRepository;

    @Autowired
    private UsersRepository usersRepository;

    @Autowired
    private BooksRepository booksRepository;

    @Autowired
    private BorrowSecurity borrowSecurity;

    @PreAuthorize("isAuthenticated()")
    @PostMapping
    public String borrowBook(@RequestBody Borrow borrow, Authentication authentication) {
        // RS-04 : un adhérent emprunte pour lui-même. L'`userId` éventuellement
        // envoyé dans le corps est écrasé par l'identité du token ; seul le
        // personnel (bibliothécaire/admin) peut le désigner explicitement.
        if (!borrowSecurity.estPersonnel(authentication)) {
            borrow.setUserId(borrowSecurity.utilisateurCourantId(authentication));
        }

        if (borrow.getUserId() == null) {
            throw new BadRequestException("Le champ 'userId' est obligatoire pour un emprunt au nom d'un adhérent.");
        }
        if (borrow.getBookId() == null) {
            throw new BadRequestException("Le champ 'bookId' est obligatoire.");
        }

        // `Optional.get()` levait une NoSuchElementException, donc un 500 : un
        // identifiant inconnu est une erreur du client, pas du serveur.
        Users user = usersRepository.findById(borrow.getUserId())
                .orElseThrow(() -> new NotFoundException("Utilisateur avec l'id " + borrow.getUserId() + " introuvable."));
        Books book = booksRepository.findById(borrow.getBookId())
                .orElseThrow(() -> new NotFoundException("Livre avec l'id " + borrow.getBookId() + " introuvable."));

        if (book.getNoOfCopies() < 1) {
            return "The book \"" + book.getBookName() + "\" is out of stock!";
        }

        book.borrowBook();
        booksRepository.save(book);

        Date currentDate = new Date();
        Date overdueDate = new Date();
        Calendar c = Calendar.getInstance();
        c.setTime(overdueDate);
        c.add(Calendar.DATE, 7);
        overdueDate = c.getTime();
        borrow.setIssueDate(currentDate);
        borrow.setDueDate(overdueDate);
        borrowRepository.save(borrow);
        return user.getName() + " has borrowed one copy of \"" + book.getBookName() + "\"!";
    }

    /**
     * Tous les emprunts : réservé au personnel. Un adhérent n'a aucune raison de
     * lire qui a emprunté quoi ; il obtient 403.
     */
    @PreAuthorize("hasAnyRole('Admin', 'BIBLIOTHECAIRE')")
    @GetMapping
    public List<Borrow> getAllBorrow() {
        return borrowRepository.findAll();
    }

    /**
     * Retour d'un exemplaire. Un adhérent ne peut rendre que son propre emprunt,
     * le personnel n'importe lequel. L'emprunt inconnu renvoie 404 grâce au
     * {@code true} renvoyé par {@code estProprietaire} : l'autorisation passe,
     * c'est le contrôleur qui constate l'absence.
     */
    @PreAuthorize("hasAnyRole('Admin', 'BIBLIOTHECAIRE') or @borrowSecurity.estProprietaire(#borrow.borrowId, authentication)")
    @PutMapping
    public Borrow returnBook(@RequestBody Borrow borrow) {
        Borrow borrowBook = borrowRepository.findById(borrow.getBorrowId())
                .orElseThrow(() -> new NotFoundException("Emprunt avec l'id " + borrow.getBorrowId() + " introuvable."));
        Books book = booksRepository.findById(borrowBook.getBookId())
                .orElseThrow(() -> new NotFoundException("Livre avec l'id " + borrowBook.getBookId() + " introuvable."));

        book.returnBook();
        booksRepository.save(book);

        Date currentDate = new Date();
        borrowBook.setReturnDate(currentDate);
        return borrowRepository.save(borrowBook);
    }

    /**
     * Emprunts d'un adhérent : les siens, ou n'importe lequel pour le personnel.
     * C'est l'endpoint qu'utilise l'écran « Retour d'un livre » pour lister ce
     * que l'adhérent connecté détient.
     */
    @PreAuthorize("hasAnyRole('Admin', 'BIBLIOTHECAIRE') or @borrowSecurity.estUtilisateur(#id, authentication)")
    @GetMapping("user/{id}")
    public List<Borrow> booksBorrowedByUser(@PathVariable Integer id) {
        return borrowRepository.findByUserId(id);
    }

    /**
     * Historique d'un livre : savoir qui l'a emprunté nomme les adhérents, donc
     * réservé au personnel.
     */
    @PreAuthorize("hasAnyRole('Admin', 'BIBLIOTHECAIRE')")
    @GetMapping("book/{id}")
    public List<Borrow> bookBorrowHistory(@PathVariable Integer id) {
        return borrowRepository.findByBookId(id);
    }


//    @Autowired
//    private EntityManager entityManager;
//
//    @PostMapping
//    public Borrow borrowBook(@RequestBody Borrow borrow) {
//        borrowRepository.save(borrow);
//        Books book = booksRepository.findById(borrow.getBOOKID()).orElseThrow(() -> new NotFoundException("Book not found."));
//        if(book.getNoOfCopies()-1 < 0) {
//            throw new IllegalStateException("There are no available books.");
//        }
//        book.borrowBook();
//        booksRepository.save(book);
//
//        return borrow;
//    }
//
//    @GetMapping
//    public List<Borrow> getAllBorrow() {
//        return borrowRepository.findAll();
//    }
//
//    @PutMapping
//    public Borrow returnBook(@RequestBody Borrow borrow) {
//        borrowRepository.save(borrow);
//        Books book = booksRepository.findById(borrow.getBOOKID()).orElseThrow(() -> new NotFoundException("Book not found."));
//        book.returnBook();
//        booksRepository.save(book);
//
//        Date currentDate = new Date(new java.util.Date().getTime());
//        borrow.setReturnDate(currentDate);
//        return borrow;
//    }
//
//    @GetMapping("user/{id}")
//    public List<Books> booksBorrowedByUser(@PathVariable Integer id) {
//        Query q = entityManager.createNativeQuery("SELECT * FROM BOOKS AS B, BORROW AS L WHERE B.book_id = L.BOOKID AND L.USERID = " + id);
//        List<Books> borrowedBooks = q.getResultList();
//        return borrowedBooks;
//    }
//
//    @GetMapping("book/{id}")
//    public List<Users> bookBorrowHistory(@PathVariable Integer id) {
//        Query q = entityManager.createNativeQuery("SELECT * FROM USERS AS U, BORROW AS L WHERE U.user_id = L.USERID AND L.BOOKID = " + id);
//        List<Users> usersList = q.getResultList();
//        return usersList;
//    }

//    @PostMapping
//    public Borrow borrowBook(@RequestBody Borrow borrow) {
//        borrow(borrow.getBorrowId(), borrow.getUser().getUserId(), borrow.getBook().getBookId());
//        return borrow;
//    }
//
//    @GetMapping
//    public List<Borrow> getAllBorrow() {
//        return borrowRepository.findAll();
//    }
//
//    @PutMapping
//    public Borrow returnBook(@RequestBody Borrow borrow) {
//        Books book = booksRepository.findById(borrow.getBook().getBookId()).orElseThrow(() -> new NotFoundException("Book not found."));
//        book.returnBook();
//        booksRepository.save(book);
//
//        Date currentDate = new Date(new java.util.Date().getTime());
//        borrow.setReturnDate(currentDate);
//        return borrowRepository.save(borrow);
//    }
//
//    @GetMapping("user/{id}")
//    public List<Books> booksBorrowedByUser(@PathVariable Integer id) {
//        Users user = usersRepository.findById(id).orElseThrow(() -> new NotFoundException("User not found."));
//        return user.getBooks();
//    }
//
//    @GetMapping("book/{id}")
//    public List<Users> bookBorrowHistory(@PathVariable Integer id) {
//        Books book = booksRepository.findById(id).orElseThrow(() -> new NotFoundException("Book not found."));
//        return book.getUsers();
//    }
//
//    public void borrow(Integer borrowId, Integer userId, Integer bookId) {
//        Users user = usersRepository.findById(userId).orElseThrow(() -> new NotFoundException("User not found."));
//        if(user.getBooks().stream().anyMatch(book -> Objects.equals(book.getBookId(), bookId))) {
//            throw new IllegalStateException("User already borrowed the book");
//        }
//
//        Books book = booksRepository.findById(bookId).orElseThrow(() -> new NotFoundException("Book not found."));
//        if(book.getNoOfCopies()-1 < 0) {
//            throw new IllegalStateException("There are no available books.");
//        }
//
//        book.getUsers().add(user);
//        book.setNoOfCopies(book.getNoOfCopies()-1);
//        booksRepository.save(book);
//
//        user.getBooks().add(book);
//        usersRepository.save(user);
//    }

}
