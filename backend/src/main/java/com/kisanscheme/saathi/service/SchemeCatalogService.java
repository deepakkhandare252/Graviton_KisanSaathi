package com.kisanscheme.saathi.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.benmanes.caffeine.cache.stats.CacheStats;
import com.kisanscheme.saathi.config.CacheConfig;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Loads and caches public verified Karnataka scheme definitions, document checklists,
 * and application portal guides using Caffeine.
 */
@Service
public class SchemeCatalogService {

    private final ObjectMapper objectMapper;
    private final ResourceLoader resourceLoader;
    private final CacheManager cacheManager;
    private final String catalogPath;

    public SchemeCatalogService(
            ObjectMapper objectMapper,
            ResourceLoader resourceLoader,
            CacheManager cacheManager,
            @Value("${kisan.schemes.catalog-path:classpath:schemes/karnataka-schemes.json}") String catalogPath
    ) {
        this.objectMapper = objectMapper;
        this.resourceLoader = resourceLoader;
        this.cacheManager = cacheManager;
        this.catalogPath = catalogPath;
    }

    @Cacheable(
            cacheNames = CacheConfig.SCHEMES_CATALOG_CACHE,
            key = "#category == null || #category.isBlank() ? 'ALL' : #category.trim().toLowerCase()"
    )
    public List<Map<String, Object>> getAllSchemes(String category) {
        List<Map<String, Object>> all = loadCatalogFromResource();
        if (category == null || category.isBlank()) {
            return all;
        }
        String normalized = category.trim().toLowerCase();
        return all.stream()
                .filter(item -> normalized.equals(String.valueOf(item.getOrDefault("category", "")).trim().toLowerCase()))
                .toList();
    }

    @Cacheable(cacheNames = CacheConfig.SCHEME_DETAILS_CACHE, key = "#schemeId")
    public Optional<Map<String, Object>> getSchemeById(String schemeId) {
        if (schemeId == null || schemeId.isBlank()) {
            return Optional.empty();
        }
        return loadCatalogFromResource().stream()
                .filter(item -> schemeId.equals(item.get("id")))
                .findFirst();
    }

    @Cacheable(cacheNames = CacheConfig.SCHEME_CHECKLISTS_CACHE, key = "#schemeId")
    public Optional<Map<String, Object>> getSchemeChecklist(String schemeId) {
        return getSchemeById(schemeId).map(scheme -> {
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("schemeId", scheme.get("id"));
            response.put("schemeNameEn", scheme.get("nameEn"));
            response.put("schemeNameKn", scheme.get("nameKn"));
            response.put("prerequisites", scheme.getOrDefault("prerequisites", Collections.emptyList()));
            return response;
        });
    }

    @Cacheable(cacheNames = CacheConfig.SCHEME_GUIDES_CACHE, key = "#schemeId")
    public Optional<Map<String, Object>> getSchemeApplicationGuide(String schemeId) {
        return getSchemeById(schemeId).map(scheme -> {
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("schemeId", scheme.get("id"));
            response.put("schemeNameEn", scheme.get("nameEn"));
            response.put("schemeNameKn", scheme.get("nameKn"));
            response.put("officialPortalUrl", scheme.get("officialPortalUrl"));
            response.put("informationUrl", scheme.get("informationUrl"));
            response.put("helplinePhone", scheme.get("helplinePhone"));
            response.put("stepsEn", scheme.getOrDefault("applicationStepsEn", Collections.emptyList()));
            response.put("stepsKn", scheme.getOrDefault("applicationStepsKn", Collections.emptyList()));
            response.put("assistanceCentresEn", scheme.getOrDefault("assistanceCentresEn", Collections.emptyList()));
            response.put("assistanceCentresKn", scheme.getOrDefault("assistanceCentresKn", Collections.emptyList()));
            response.put("lastVerifiedDate", scheme.get("lastVerifiedDate"));
            response.put("applicationDeadline", scheme.get("applicationDeadline"));
            response.put("deadlineVerified", Boolean.TRUE.equals(scheme.get("deadlineVerified")));
            return response;
        });
    }

    @CacheEvict(
            cacheNames = {
                    CacheConfig.SCHEMES_CATALOG_CACHE,
                    CacheConfig.SCHEME_DETAILS_CACHE,
                    CacheConfig.SCHEME_CHECKLISTS_CACHE,
                    CacheConfig.SCHEME_GUIDES_CACHE
            },
            allEntries = true
    )
    public void evictAllSchemeCaches() {
        // Triggered when curated scheme rules JSON is updated or refreshed
    }

    public Map<String, Object> getCacheStats() {
        Map<String, Object> metrics = new LinkedHashMap<>();
        for (String name : List.of(
                CacheConfig.SCHEMES_CATALOG_CACHE,
                CacheConfig.SCHEME_DETAILS_CACHE,
                CacheConfig.SCHEME_CHECKLISTS_CACHE,
                CacheConfig.SCHEME_GUIDES_CACHE
        )) {
            Cache springCache = cacheManager.getCache(name);
            if (springCache instanceof CaffeineCache caffeineCache) {
                com.github.benmanes.caffeine.cache.Cache<Object, Object> nativeCache = caffeineCache.getNativeCache();
                CacheStats stats = nativeCache.stats();
                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("size", nativeCache.estimatedSize());
                entry.put("hitCount", stats.hitCount());
                entry.put("missCount", stats.missCount());
                entry.put("hitRate", stats.hitRate());
                entry.put("evictionCount", stats.evictionCount());
                metrics.put(name, entry);
            }
        }
        return metrics;
    }

    protected List<Map<String, Object>> loadCatalogFromResource() {
        Resource resource = resourceLoader.getResource(catalogPath);
        try (InputStream is = resource.getInputStream()) {
            return objectMapper.readValue(is, new TypeReference<>() {});
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to load Karnataka schemes catalog from " + catalogPath, ex);
        }
    }
}
