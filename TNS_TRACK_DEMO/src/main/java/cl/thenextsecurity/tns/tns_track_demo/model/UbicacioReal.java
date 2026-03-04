package cl.thenextsecurity.tns.tns_track_demo.model;

import java.sql.Date;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;


@Data
@NoArgsConstructor
@AllArgsConstructor
public class UbicacioReal {

    private int id_ubicacion_real;
    private String nombre;
    private String descripcion;
    private boolean activo;
    private Date fecha_creacion;
    private Date fecha_actualizacion;
}
