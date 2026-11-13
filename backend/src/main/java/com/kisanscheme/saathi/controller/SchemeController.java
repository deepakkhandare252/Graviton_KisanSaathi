package com.kisanscheme.saathi.controller;

import com.kisanscheme.saathi.service.SchemeCatalogService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Public verified Karnataka scheme catalog, document checklist, and application guide endpoints.
 * Backed by server-side Caffeine caching and HTTP Cache-Control headers.
 */
@RestController
@RequestMapping("/schemes")
public class SchemeController {

    private static final CacheControl PUBLIC_CATALOG_CACHE =
            CacheControl.maxAge(5, TimeUnit.MINUTES).cachePublic().staleWhileRevalidate(10, TimeUnit.MINUTES);

    private final SchemeCatalogService schemeCatalogService;

    public SchemeController(SchemeCatalogService schemeCatalogService) {
        this.schemeCatalogService = schemeCatalogService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllSchemes(
            @RequestParam(required = false) String category
    ) {
        List<Map<String, Object>> schemes = schemeCatalogService.getAllSchemes(category);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("schemes", schemes);
        body.put("total", schemes.size());
        body.put("version", "2026.5-KAR");
        body.put("lastVerifiedDate", "2026-11-10");
        return ResponseEntity.ok().cacheControl(PUBLIC_CATALOG_CACHE).body(body);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getSchemeById(@PathVariable String id) {
        return schemeCatalogService.getSchemeById(id)
                .<ResponseEntity<?>>map(scheme -> ResponseEntity.ok().cacheControl(PUBLIC_CATALOG_CACHE).body(scheme))
                .orElseGet(() -> ResponseEntity.status(404).body(Map.of(
                        "error", "Scheme not found",
                        "schemeId", id
                )));
    }

    @GetMapping("/{id}/checklist")
    public ResponseEntity<?> getSchemeChecklist(@PathVariable String id) {
        return schemeCatalogService.getSchemeChecklist(id)
                .<ResponseEntity<?>>map(payload -> ResponseEntity.ok().cacheControl(PUBLIC_CATALOG_CACHE).body(payload))
                .orElseGet(() -> ResponseEntity.status(404).body(Map.of("error", "Scheme not found")));
    }

    @GetMapping("/{id}/application-guide")
    public ResponseEntity<?> getSchemeApplicationGuide(@PathVariable String id) {
        return schemeCatalogService.getSchemeApplicationGuide(id)
                .<ResponseEntity<?>>map(payload -> ResponseEntity.ok().cacheControl(PUBLIC_CATALOG_CACHE).body(payload))
                .orElseGet(() -> ResponseEntity.status(404).body(Map.of("error", "Scheme not found")));
    }

    @GetMapping("/cache/stats")
    public ResponseEntity<Map<String, Object>> getCacheStats() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(Map.of(
                "caches", schemeCatalogService.getCacheStats()
        ));
    }

    @PostMapping("/cache/refresh")
    public ResponseEntity<Map<String, Object>> refreshSchemeCache() {
        schemeCatalogService.evictAllSchemeCaches();
        List<Map<String, Object>> reloaded = schemeCatalogService.getAllSchemes(null);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(Map.of(
                "refreshed", true,
                "total", reloaded.size(),
                "version", "2026.5-KAR"
        ));
    }
}
