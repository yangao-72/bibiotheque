package com.ibizabroker.bibliotheque.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import javax.persistence.*;
import java.util.Date;
import java.util.Set;

@Data
@Entity
public class Users {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Integer userId;
    private String username;
    private String name;
    private String password;

    /**
     * Suppression logique : un compte désactivé ne se connecte plus et disparaît
     * de la liste des adhérents, mais ses réservations et emprunts restent en
     * base — l'historique est conservé.
     *
     * <p>Le type est volontairement {@link Boolean} et non {@code boolean} :
     * {@code ddl-auto=update} ajoute la colonne sans valeur par défaut aux lignes
     * déjà présentes, qui se retrouvent donc à {@code NULL}. On les traite comme
     * des comptes actifs, sinon tous les comptes existants deviendraient
     * subitement inutilisables au déploiement.</p>
     */
    private Boolean actif = true;

    /**
     * Trace d'audit de la désactivation : quand et pourquoi le compte a été
     * retiré. Renseignés par l'administrateur, effacés à la réactivation — ces
     * champs décrivent la désactivation en cours, pas un journal.
     *
     * <p>Format « date + heure » ({@code dd-MM-yyyy HH:mm}) : au jour près, on ne
     * pourrait pas démêler deux retraits successifs dans la même journée.</p>
     */
    @Temporal(TemporalType.TIMESTAMP)
    @JsonFormat(pattern = "dd-MM-yyyy HH:mm")
    private Date dateDesactivation;

    /** Motif saisi par l'administrateur, limité à 500 caractères. */
    @Column(length = 500)
    private String motifDesactivation;

    @ManyToMany(fetch = FetchType.EAGER, cascade = CascadeType.ALL)
    @JoinTable(name = "USER_ROLE",
            joinColumns = {
                    @JoinColumn(name = "USER_ID")
            },
            inverseJoinColumns = {
                    @JoinColumn(name = "ROLE_ID")
            }
    )
    private Set<Role> role;

    /** Vrai si le compte est utilisable (les lignes historiques à {@code null} le sont). */
    public boolean estActif() {
        return actif == null || actif;
    }

}

