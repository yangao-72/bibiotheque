package com.ibizabroker.bibliotheque;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Le profil `test` bascule la datasource sur H2 en mémoire : la suite de tests
 * s'exécute sans qu'aucune base PostgreSQL ne tourne.
 */
@SpringBootTest
@ActiveProfiles("test")
class BibliothequeApplicationTests {

	@Test
	void contextLoads() {
	}

}
