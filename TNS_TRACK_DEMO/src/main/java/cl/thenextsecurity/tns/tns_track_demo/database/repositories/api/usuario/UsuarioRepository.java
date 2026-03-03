package cl.thenextsecurity.tns.tns_track_demo.database.repositories.api.usuario;

import cl.thenextsecurity.tns.tns_track_demo.database.repositories.custom.contracts.UsuarioCustomRepo;
import cl.thenextsecurity.tns.tns_track_demo.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repositorio unificado de Usuarios.
 * Hereda de JpaRepository para las funciones automáticas (findAll, save, delete)
 * y de UsuarioCustomRepo para tus funciones manuales de SQL.
 */
@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long>, UsuarioCustomRepo {
    // Aquí puedes agregar consultas por nombre de método (Query Methods de Spring)
    // Ejemplo: Usuario findByEmail(String email);
}
