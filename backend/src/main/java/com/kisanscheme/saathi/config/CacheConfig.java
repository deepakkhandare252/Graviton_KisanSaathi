package com.kisanscheme.saathi.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * Configures Caffeine in-memory caching strictly for public Karnataka scheme metadata
 * (scheme catalog, scheme details, document checklists, and application guides).
 *
 * Security boundary: OTP codes, authentication tokens, security decisions,
 * and private farmer account records are intentionally excluded from this cache.
 */
@Configuration
public class CacheConfig {

    public static final String SCHEMES_CATALOG_CACHE = "schemesCatalog";
    public static final String SCHEME_DETAILS_CACHE = "schemeDetails";
    public static final String SCHEME_CHECKLISTS_CACHE = "schemeChecklists";
    public static final String SCHEME_GUIDES_CACHE = "schemeGuides";

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager(
                SCHEMES_CATALOG_CACHE,
                SCHEME_DETAILS_CACHE,
                SCHEME_CHECKLISTS_CACHE,
                SCHEME_GUIDES_CACHE
        );
        cacheManager.setCaffeine(
                Caffeine.newBuilder()
                        .expireAfterWrite(30, TimeUnit.MINUTES)
                        .maximumSize(200)
                        .recordStats()
        );
        return cacheManager;
    }
}
