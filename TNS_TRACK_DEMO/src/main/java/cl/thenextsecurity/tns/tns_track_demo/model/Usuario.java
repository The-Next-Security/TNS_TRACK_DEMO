package cl.thenextsecurity.tns.tns_track_demo.model;


import cl.thenextsecurity.tns.tns_track_demo.database.repositories.custom.logic.UsuarioCustomRepoImpl;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.sql.Date;


@Data
@NoArgsConstructor
@AllArgsConstructor
public class Usuario {
    private int id_usuario;
    private String Nombre;
    private String Apellido;
    private String Email;
    private boolean activo;
    private Date Fecha_cracion;
    private Date Fecha_Acutalizacion;

    public Usuario(long id_usuario) {
        UsuarioCustomRepoImpl busquedaUsuario = new UsuarioCustomRepoImpl();
        Usuario desde_bbdd = busquedaUsuario.findUsuarioByIdFull(id_usuario);
        if (desde_bbdd != null) {
            this.id_usuario = desde_bbdd.getId_usuario();
            this.Nombre = desde_bbdd.getNombre();
            this.Apellido = desde_bbdd.getApellido();
            this.Email = desde_bbdd.getEmail();
            this.activo = desde_bbdd.isActivo();
            this.Fecha_cracion = desde_bbdd.getFecha_cracion();
            this.Fecha_Acutalizacion = desde_bbdd.getFecha_Acutalizacion();
        }
    }

    public Usuario(String email){
        UsuarioCustomRepoImpl busquedaUsuario = new UsuarioCustomRepoImpl();
        Usuario desde_bbdd = busquedaUsuario.findUsuarioByEmail(email);
        if (desde_bbdd != null) {
            this.id_usuario = desde_bbdd.getId_usuario();
            this.Nombre = desde_bbdd.getNombre();
            this.Apellido = desde_bbdd.getApellido();
            this.Email = desde_bbdd.getEmail();
            this.activo = desde_bbdd.isActivo();
            this.Fecha_cracion = desde_bbdd.getFecha_cracion();
            this.Fecha_Acutalizacion = desde_bbdd.getFecha_Acutalizacion();
        }
    }

    public Usuario(String nombre , String apellido){
        UsuarioCustomRepoImpl busquedaUsuario = new UsuarioCustomRepoImpl();
        Usuario desde_bbdd = busquedaUsuario.findByNombreCompleto(nombre, apellido);
        if (desde_bbdd != null) {
            this.id_usuario = desde_bbdd.getId_usuario();
            this.Nombre = desde_bbdd.getNombre();
            this.Apellido = desde_bbdd.getApellido();
            this.Email = desde_bbdd.getEmail();
            this.activo = desde_bbdd.isActivo();
            this.Fecha_cracion = desde_bbdd.getFecha_cracion();
            this.Fecha_Acutalizacion = desde_bbdd.getFecha_Acutalizacion();
        }
    }

}
