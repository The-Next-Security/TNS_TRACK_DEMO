package cl.thenextsecurity.tns.tns_track_demo.utils.sql;

/**
 * Almacén de constantes para consultas SQL relacionadas con Usuarios.
 * Evita que el código de lógica se ensucie con textos de SQL gigantes.
 */
public final class UsuarioQueries {

    // Constructor privado para evitar que alguien cree un objeto de esta clase
    private UsuarioQueries() {}

    /**
     * Consulta para obtener todos los campos de un usuario por su ID.
     */
    public static final String FIND_BY_ID_FULL = 
        "SELECT * FROM usuarios WHERE id = :id";
}
