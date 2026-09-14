package com.ibizabroker.bibliotheque.entity;

import lombok.Data;

/**
 * Corps de {@code POST /api/reservations}.
 *
 * <p>Les deux champs viennent du client, donc aucun des deux ne fait autorité sur
 * l'identité du propriétaire : RS-04 impose que {@code adherentId} soit ignoré
 * pour un ADHERENT, et remplacé par l'identité portée par le token. Le champ n'est
 * lu que pour un BIBLIOTHECAIRE, qui réserve pour l'adhérent de son choix (il y est
 * alors obligatoire). Le champ est conservé dans le DTO pour que la requête reste
 * lisible et documentée dans Swagger, mais sa valeur ne détermine jamais qui
 * possède la réservation.</p>
 *
 * <p>Un ADHERENT qui renseigne l'identifiant d'un autre n'est pas corrigé en
 * silence : la requête est rejetée en <b>403</b> (voir
 * {@link com.ibizabroker.bibliotheque.service.ReservationService}).</p>
 */
@Data
public class ReservationRequest {

    private Integer livreId;

    /**
     * Obligatoire pour un BIBLIOTHECAIRE, qui vise l'adhérent de son choix.
     * Pour un ADHERENT : facultatif, et accepté uniquement si la valeur est la
     * sienne — sinon 403.
     */
    private Integer adherentId;
}
