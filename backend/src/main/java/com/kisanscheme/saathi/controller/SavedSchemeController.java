package com.kisanscheme.saathi.controller;

import com.kisanscheme.saathi.model.SavedScheme;
import com.kisanscheme.saathi.model.User;
import com.kisanscheme.saathi.repository.SavedSchemeRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/saved-schemes")
public class SavedSchemeController {

    private final SavedSchemeRepository savedSchemeRepository;

    public SavedSchemeController(SavedSchemeRepository savedSchemeRepository) {
        this.savedSchemeRepository = savedSchemeRepository;
    }

    public record SaveSchemeRequest(
        String schemeId,
        String schemeNameSnapshot,
        String applicationDeadline,
        Boolean deadlineVerified,
        String customDeadline,
        Boolean reminderEnabled,
        List<Integer> reminderDaysBefore,
        String notes,
        String userNotes
    ) {}

    public record UpdateReminderRequest(
        Boolean reminderEnabled,
        List<Integer> reminderDaysBefore,
        String customDeadline,
        String userNotes,
        Boolean reminderDismissed
    ) {}

    @GetMapping
    public ResponseEntity<Map<String, Object>> listSaved(@AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        List<Map<String, Object>> items = savedSchemeRepository.findByUserOrderBySavedAtDesc(user)
            .stream()
            .map(this::toDto)
            .toList();
        return ResponseEntity.ok(Map.of("savedSchemes", items));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<Map<String, Object>> saveScheme(
        @AuthenticationPrincipal User user,
        @RequestBody SaveSchemeRequest req
    ) {
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        if (req.schemeId() == null || req.schemeId().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "schemeId is required"));
        }

        SavedScheme entity = savedSchemeRepository.findByUserAndSchemeId(user, req.schemeId())
            .orElseGet(() -> {
                SavedScheme created = new SavedScheme();
                created.setId("sv_" + UUID.randomUUID());
                created.setUser(user);
                created.setSchemeId(req.schemeId());
                created.setSavedAt(LocalDateTime.now());
                return created;
            });

        if (req.schemeNameSnapshot() != null) entity.setSchemeNameSnapshot(req.schemeNameSnapshot());
        if (req.applicationDeadline() != null && !req.applicationDeadline().isBlank()) {
            entity.setApplicationDeadline(LocalDate.parse(req.applicationDeadline()));
        }
        if (req.deadlineVerified() != null) entity.setDeadlineVerified(req.deadlineVerified());
        if (req.customDeadline() != null) {
            entity.setCustomDeadline(req.customDeadline().isBlank() ? null : LocalDate.parse(req.customDeadline()));
        }
        if (req.reminderEnabled() != null) entity.setReminderEnabled(req.reminderEnabled());
        if (req.reminderDaysBefore() != null && !req.reminderDaysBefore().isEmpty()) {
            entity.setReminderDaysBefore(joinDays(req.reminderDaysBefore()));
        }
        if (req.notes() != null) entity.setNotes(req.notes());
        if (req.userNotes() != null) entity.setUserNotes(req.userNotes());

        savedSchemeRepository.save(entity);
        return ResponseEntity.status(201).body(Map.of("savedScheme", toDto(entity)));
    }

    @PatchMapping("/{schemeId}/reminder")
    @Transactional
    public ResponseEntity<Map<String, Object>> updateReminder(
        @AuthenticationPrincipal User user,
        @PathVariable String schemeId,
        @RequestBody UpdateReminderRequest req
    ) {
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        SavedScheme entity = savedSchemeRepository.findByUserAndSchemeId(user, schemeId).orElse(null);
        if (entity == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Saved scheme not found"));
        }

        if (req.reminderEnabled() != null) entity.setReminderEnabled(req.reminderEnabled());
        if (req.reminderDaysBefore() != null) entity.setReminderDaysBefore(joinDays(req.reminderDaysBefore()));
        if (req.customDeadline() != null) {
            entity.setCustomDeadline(req.customDeadline().isBlank() ? null : LocalDate.parse(req.customDeadline()));
            entity.setReminderDismissed(false);
        }
        if (req.userNotes() != null) entity.setUserNotes(req.userNotes());
        if (req.reminderDismissed() != null) entity.setReminderDismissed(req.reminderDismissed());

        savedSchemeRepository.save(entity);
        return ResponseEntity.ok(Map.of("savedScheme", toDto(entity)));
    }

    @DeleteMapping("/{schemeId}")
    @Transactional
    public ResponseEntity<Map<String, Object>> deleteSaved(
        @AuthenticationPrincipal User user,
        @PathVariable String schemeId
    ) {
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        savedSchemeRepository.deleteByUserAndSchemeId(user, schemeId);
        return ResponseEntity.ok(Map.of("success", true));
    }

    private String joinDays(List<Integer> days) {
        return days.stream().distinct().sorted((a, b) -> b - a).map(String::valueOf)
            .reduce((a, b) -> a + "," + b).orElse("30,7,3,1");
    }

    private List<Integer> parseDays(String csv) {
        if (csv == null || csv.isBlank()) return List.of(30, 7, 3, 1);
        return Arrays.stream(csv.split(",")).map(String::trim).filter(s -> !s.isBlank())
            .map(Integer::parseInt).toList();
    }

    private Map<String, Object> toDto(SavedScheme s) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", s.getId());
        map.put("userId", s.getUser().getId());
        map.put("schemeId", s.getSchemeId());
        map.put("schemeNameSnapshot", s.getSchemeNameSnapshot());
        map.put("applicationDeadline", s.getApplicationDeadline() != null ? s.getApplicationDeadline().toString() : null);
        map.put("deadlineVerified", s.isDeadlineVerified());
        map.put("customDeadline", s.getCustomDeadline() != null ? s.getCustomDeadline().toString() : null);
        map.put("reminderEnabled", s.isReminderEnabled());
        map.put("reminderDaysBefore", parseDays(s.getReminderDaysBefore()));
        map.put("lastReminderSentAt", s.getLastReminderSentAt() != null ? s.getLastReminderSentAt().toString() : null);
        map.put("reminderAcknowledgedAt", s.getReminderAcknowledgedAt() != null ? s.getReminderAcknowledgedAt().toString() : null);
        map.put("reminderDismissed", s.isReminderDismissed());
        map.put("notes", s.getNotes());
        map.put("userNotes", s.getUserNotes());
        map.put("savedAt", s.getSavedAt().toString());
        return map;
    }
}
