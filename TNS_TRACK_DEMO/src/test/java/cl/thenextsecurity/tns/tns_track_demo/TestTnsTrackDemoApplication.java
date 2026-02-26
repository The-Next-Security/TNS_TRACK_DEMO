package cl.thenextsecurity.tns.tns_track_demo;

import org.springframework.boot.SpringApplication;

public class TestTnsTrackDemoApplication {

    public static void main(String[] args) {
        SpringApplication.from(TnsTrackDemoApplication::main).with(TestcontainersConfiguration.class).run(args);
    }

}
