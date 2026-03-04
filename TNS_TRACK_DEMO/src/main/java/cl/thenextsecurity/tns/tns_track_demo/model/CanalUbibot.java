package cl.thenextsecurity.tns.tns_track_demo.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class CanalUbibot {
  private int id_canal;
  private UbicacioReal id_ubicacion_real;
  private long canal_id;
  private String nombre;
  private String id_producto;
  private String id_dispositivo;
  private double latitud;
  private double longitud;
  private String firmware;
  private String mac_address;
  private boolean en_linea;
  private double temperatura_minima_umbral;
  private double temperatura_maxima_umbral;
 
}
