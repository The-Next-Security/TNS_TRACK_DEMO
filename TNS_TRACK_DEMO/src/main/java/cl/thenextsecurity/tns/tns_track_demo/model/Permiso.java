package cl.thenextsecurity.tns.tns_track_demo.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.sql.Date;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Permiso {

    private int id_permiso;
    private String nombre;
    private String descripcion;
    private boolean activo;
    private Date fecha_cracion;
    private Date fecha_acutalizacion;

}