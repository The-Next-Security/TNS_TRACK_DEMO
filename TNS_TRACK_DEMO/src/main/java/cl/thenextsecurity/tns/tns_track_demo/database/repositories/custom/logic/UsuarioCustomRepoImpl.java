package cl.thenextsecurity.tns.tns_track_demo.database.repositories.custom.logic;

import cl.thenextsecurity.tns.tns_track_demo.database.repositories.custom.contracts.UsuarioCustomRepo;
import cl.thenextsecurity.tns.tns_track_demo.model.Usuario;
import cl.thenextsecurity.tns.tns_track_demo.utils.sql.UsuarioQueries;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.springframework.stereotype.Repository;

/**
 * Implementación de las consultas custom de Usuarios.
 * Esta clase es la encargada de ejecutar el código SQL real.
 * Por convención, termina con 'Impl' para que Spring la asocie automáticamente.
 */
@Repository
public class UsuarioCustomRepoImpl implements UsuarioCustomRepo {

    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Implementa la consulta personalizada usando SQL Nativo.
     * La conexión se obtiene del pool JUSTO cuando se ejecuta getResultList().
     */
    @Override
    public Usuario findUsuarioByIdFull(Long id) {
        // La conexión se activa cuando pedimos el resultado de la consulta.
        Query query = entityManager.createNativeQuery(
            UsuarioQueries.FIND_BY_ID_FULL,
            Usuario.class
        );
        
        query.setParameter("id", id);

        try {
            return (Usuario) query.getSingleResult();
        } catch (jakarta.persistence.NoResultException e) {
            return null; // Si no hay resultados, devolvemos null de forma segura.
        }
    }

    @Override
    public Usuario findUsuarioByEmail(String email) {
        return null;
    }

    @Override
    public Usuario findByNombreCompleto(String nombre, String apellido) {
        return null;
    }
}
