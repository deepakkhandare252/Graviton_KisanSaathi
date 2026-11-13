package com.kisanscheme.saathi.controller;

import com.kisanscheme.saathi.model.ApplicationRecord;
import com.kisanscheme.saathi.model.ApplicationStatus;
import com.kisanscheme.saathi.model.ApplicationTimelineEvent;
import com.kisanscheme.saathi.model.User;
import com.kisanscheme.saathi.repository.ApplicationRecordRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/applications")
public class ApplicationController {

    private final ApplicationRecordRepository applicationRepository;

    public ApplicationController(ApplicationRecordRepository applicationRepository) {
        this.applicationRepository = applicationRepository;
    }

    public record CreateApplicationRequest(
        String schemeId,
        String schemeNameSnapshot,
        Integer readinessSnapshot,
        String eligibilitySnapshot,
        ApplicationStatus status,
        String notes,
        String appliedThroughPortal,
        String acknowledgementNumber
    ) {}

    public record UpdateApplicationRequest(
        ApplicationStatus status,
        String notes,
        String appliedThroughPortal,
        String acknowledgementNumber,
        String timelineNote,
        Integer readinessSnapshot
    ) {}

    @GetMapping
    public ResponseEntity<Map<String, Object>> list(@AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        List<Map<String, Object>> apps = applicationRepository.findByUserOrderByUpdatedAtDesc(user)
            .stream().map(this::toDto).toList();
        return ResponseEntity.ok(Map.of("applications", apps));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getOne(
        @AuthenticationPrincipal User user,
        @PathVariable String id
    ) {
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        return applicationRepository.findByIdAndUser(id, user)
            .map(app -> ResponseEntity.ok(toDto(app)))
            .orElse(ResponseEntity.status(404).body(Map.of("error", "Application record not found")));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<Map<String, Object>> create(
        @AuthenticationPrincipal User user,
        @RequestBody CreateApplicationRequest req
    ) {
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        if (req.schemeId() == null || req.schemeId().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "schemeId is required"));
        }

        ApplicationStatus initialStatus = req.status() != null ? req.status() : ApplicationStatus.INTERESTED;
        ApplicationRecord record = new ApplicationRecord("app_" + UUID.randomUUID(), user, req.schemeId(), initialStatus);
        record.setSchemeNameSnapshot(req.schemeNameSnapshot());
        record.setReadinessSnapshot(req.readinessSnapshot());
        record.setEligibilitySnapshot(req.eligibilitySnapshot());
        record.setAppliedThroughPortal(req.appliedThroughPortal());
        record.setAcknowledgementNumber(req.acknowledgementNumber());
        record.setNotes(req.notes());
        record.setApplicationDate(LocalDateTime.now());
        record.addTimelineEvent(new ApplicationTimelineEvent(
            "evt_" + UUID.randomUUID(),
            record,
            initialStatus,
            req.notes() != null ? req.notes() : "Application tracking initialized"
        ));

        applicationRepository.save(record);
        return ResponseEntity.status(201).body(toDto(record));
    }

    @PatchMapping("/{id}")
    @Transactional
    public ResponseEntity<Map<String, Object>> update(
        @AuthenticationPrincipal User user,
        @PathVariable String id,
        @RequestBody UpdateApplicationRequest req
    ) {
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        ApplicationRecord record = applicationRepository.findByIdAndUser(id, user).orElse(null);
        if (record == null) return ResponseEntity.status(404).body(Map.of("error", "Application record not found"));

        boolean statusChanged = req.status() != null && req.status() != record.getStatus();
        if (req.status() != null) record.setStatus(req.status());
        if (req.notes() != null) record.setNotes(req.notes());
        if (req.appliedThroughPortal() != null) record.setAppliedThroughPortal(req.appliedThroughPortal());
        if (req.acknowledgementNumber() != null) record.setAcknowledgementNumber(req.acknowledgementNumber());
        if (req.readinessSnapshot() != null) record.setReadinessSnapshot(req.readinessSnapshot());
        record.setUpdatedAt(LocalDateTime.now());

        if (statusChanged || (req.timelineNote() != null && !req.timelineNote().isBlank())) {
            record.addTimelineEvent(new ApplicationTimelineEvent(
                "evt_" + UUID.randomUUID(),
                record,
                record.getStatus(),
                req.timelineNote() != null && !req.timelineNote().isBlank()
                    ? req.timelineNote()
                    : "Status updated to " + record.getStatus().name()
            ));
        }

        applicationRepository.save(record);
        return ResponseEntity.ok(toDto(record));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Map<String, Object>> delete(
        @AuthenticationPrincipal User user,
        @PathVariable String id
    ) {
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        applicationRepository.deleteByIdAndUser(id, user);
        return ResponseEntity.ok(Map.of("success", true));
    }

    private Map<String, Object> toDto(ApplicationRecord a) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", a.getId());
        map.put("userId", a.getUser().getId());
        map.put("schemeId", a.getSchemeId());
        map.put("schemeNameSnapshot", a.getSchemeNameSnapshot());
        map.put("readinessSnapshot", a.getReadinessSnapshot());
        map.put("eligibilitySnapshot", a.getEligibilitySnapshot());
        map.put("status", a.getStatus().name());
        map.put("applicationDate", a.getApplicationDate() != null ? a.getApplicationDate().toString() : null);
        map.put("appliedThroughPortal", a.getAppliedThroughPortal());
        map.put("acknowledgementNumber", a.getAcknowledgementNumber());
        map.put("notes", a.getNotes());
        map.put("createdAt", a.getCreatedAt().toString());
        map.put("updatedAt", a.getUpdatedAt().toString());
        map.put("timeline", a.getTimeline().stream().map(evt -> Map.of(
            "id", evt.getId(),
            "applicationId", a.getId(),
            "status", evt.getStatus().name(),
            "note", evt.getNote() != null ? evt.getNote() : "",
            "timestamp", evt.getTimestamp().toString()
        )).toList());
        return map;
    }
}
