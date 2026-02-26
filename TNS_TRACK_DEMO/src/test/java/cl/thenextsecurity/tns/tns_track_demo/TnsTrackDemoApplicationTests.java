package cl.thenextsecurity.tns.tns_track_demo;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class TnsTrackDemoApplicationTests {

    @Test
    void contextLoads() {
    }

}
