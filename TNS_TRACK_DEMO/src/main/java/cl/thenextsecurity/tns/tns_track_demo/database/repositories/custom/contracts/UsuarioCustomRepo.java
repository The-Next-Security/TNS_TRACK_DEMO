package cl.thenextsecurity.tns.tns_track_demo.database.repositories.custom.contracts;

import cl.thenextsecurity.tns.tns_track_demo.model.Usuario;
import java.util.List;

/**
 * Interfaz para declarar métodos de consulta manual (custom) para Usuarios.
 * Estos métodos no son manejados automáticamente por Spring Data JPA,
 * permitiéndote implementar SQL nativo o lógica compleja.
 */
public interface UsuarioCustomRepo {

    /**
     * Busca un usuario por su ID devolviendo todos sus datos mediante SQL nativo.
     * @param id Identificador único del usuario.
     * @return El objeto Usuario completo o null si no existe.
     */
    Usuario findUsuarioByIdFull(Long id);

    Usuario findUsuarioByEmail(String email);

    Usuario findByNombreCompleto(String nombre, String apellido);
}
