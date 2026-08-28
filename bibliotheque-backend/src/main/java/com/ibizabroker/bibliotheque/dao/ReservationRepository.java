package com.ibizabroker.bibliotheque.dao;

import com.ibizabroker.bibliotheque.entity.Reservation;
import com.ibizabroker.bibliotheque.entity.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Integer> {

    List<Reservation> findByStatut(ReservationStatus statut);

    List<Reservation> findByAdherentUserId(Integer adherentId);

    List<Reservation> findByAdherentUserIdAndStatut(Integer adherentId, ReservationStatus statut);

    List<Reservation> findByLivreBookIdAndStatutIn(Integer livreId, List<ReservationStatus> statuts);

    long countByAdherentUserIdAndStatutIn(Integer adherentId, List<ReservationStatus> statuts);
}
