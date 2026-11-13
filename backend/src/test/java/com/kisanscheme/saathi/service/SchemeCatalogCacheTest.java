package com.kisanscheme.saathi.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kisanscheme.saathi.config.CacheConfig;
import org.junit.jupiter.api.Test;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.DefaultResourceLoader;

import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

class SchemeCatalogCacheTest {

    @Configuration
    @EnableCaching
    static class TestCacheContext {
        @Bean
        CacheConfig cacheConfig() {
            return new CacheConfig();
        }

        @Bean
        CacheManager cacheManager(CacheConfig cacheConfig) {
            return cacheConfig.cacheManager();
        }

        @Bean
        AtomicInteger loadCounter() {
            return new AtomicInteger(0);
        }

        @Bean
        SchemeCatalogService schemeCatalogService(CacheManager cacheManager, AtomicInteger loadCounter) {
            return new SchemeCatalogService(
                    new ObjectMapper(),
                    new DefaultResourceLoader(),
                    cacheManager,
                    "classpath:schemes/karnataka-schemes.json"
            ) {
                @Override
                protected List<Map<String, Object>> loadCatalogFromResource() {
                    loadCounter.incrementAndGet();
                    return super.loadCatalogFromResource();
                }
            };
        }
    }

    @Test
    void cachesPublicSchemesCatalogAndEvictsCleanly() {
        try (AnnotationConfigApplicationContext ctx = new AnnotationConfigApplicationContext(TestCacheContext.class)) {
            SchemeCatalogService service = ctx.getBean(SchemeCatalogService.class);
            AtomicInteger loadCounter = ctx.getBean(AtomicInteger.class);

            List<Map<String, Object>> firstLoad = service.getAllSchemes(null);
            List<Map<String, Object>> secondLoad = service.getAllSchemes(null);

            assertFalse(firstLoad.isEmpty(), "Expected Karnataka schemes catalog to load");
            assertEquals(firstLoad.size(), secondLoad.size());
            assertEquals(1, loadCounter.get(), "Second call should hit Caffeine cache without reloading JSON");

            // Detail & checklist lookups also populate distinct caches
            assertTrue(service.getSchemeById("pm-kisan-raitha-siri").isPresent());
            assertTrue(service.getSchemeChecklist("pm-kisan-raitha-siri").isPresent());
            assertTrue(service.getSchemeApplicationGuide("pm-kisan-raitha-siri").isPresent());

            Map<String, Object> statsBeforeEvict = service.getCacheStats();
            assertNotNull(statsBeforeEvict.get(CacheConfig.SCHEMES_CATALOG_CACHE));

            service.evictAllSchemeCaches();
            service.getAllSchemes(null);
            assertEquals(2, loadCounter.get(), "After eviction, next fetch should reload from resource");
        }
    }
}
