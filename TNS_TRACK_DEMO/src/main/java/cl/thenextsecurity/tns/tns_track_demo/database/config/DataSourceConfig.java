package cl.thenextsecurity.tns.tns_track_demo.database.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.datasource.LazyConnectionDataSourceProxy;

import javax.sql.DataSource;

/**
 * Configuración del DataSource para optimizar las conexiones a la base de datos.
 * Utiliza un LazyConnectionDataSourceProxy para asegurar que las conexiones solo
 * se obtengan del pool cuando sea estrictamente necesario (al ejecutar un Statement).
 */
@Configuration
public class DataSourceConfig {

    /**
     * Define el DataSource real utilizando HikariCP (estándar de alto rendimiento).
     * Las propiedades se cargan desde el prefijo 'spring.datasource.hikari'.
     */
    @Bean
    @ConfigurationProperties("spring.datasource.hikari")
    public DataSource hikariDataSource() {
        return new HikariDataSource();
    }

    /**
     * Envuelve el DataSource real en un Proxy "Perezoso".
     * Se marca como @Primary para que sea el que Spring use por defecto.
     */
    @Bean
    @Primary
    public DataSource dataSource(DataSource hikariDataSource) {
        return new LazyConnectionDataSourceProxy(hikariDataSource);
    }
}
