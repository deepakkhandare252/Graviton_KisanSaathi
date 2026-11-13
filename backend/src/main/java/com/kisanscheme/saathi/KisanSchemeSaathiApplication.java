package com.kisanscheme.saathi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Kisan Scheme Saathi Application Entry Point
 * Deterministic Rules Engine & Deadline Reminder Scheduler for Karnataka Farmer Schemes.
 */
@SpringBootApplication
@EnableScheduling
@EnableCaching
public class KisanSchemeSaathiApplication {

    public static void main(String[] args) {
        SpringApplication.run(KisanSchemeSaathiApplication.class, args);
    }
}
