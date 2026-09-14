package com.ibizabroker.bibliotheque.dao;

import com.ibizabroker.bibliotheque.entity.Users;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UsersRepository extends JpaRepository<Users, Integer> {

    Optional<Users> findByUsername(String username);

    /**
     * Comptes actifs, c'est-à-dire non supprimés logiquement.
     *
     * <p>La condition sur {@code null} n'est pas cosmétique : la colonne
     * {@code actif} est ajoutée par {@code ddl-auto=update} sans valeur par
     * défaut, donc les comptes créés avant le soft delete portent {@code NULL}.
     * Un simple {@code actif = true} les ferait disparaître de la liste.</p>
     */
    @Query("select u from Users u where u.actif is null or u.actif = true")
    List<Users> findAllActifs();
}
