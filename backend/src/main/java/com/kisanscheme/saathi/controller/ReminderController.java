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
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.*;

@RestController
@RequestMapping("/reminders")
public class ReminderController {

    private static final ZoneId IST_ZONE = ZoneId.of("Asia/Kolkata");
    private final SavedSchemeRepository savedSchemeRepository;

    public ReminderController(SavedSchemeRepository savedSchemeRepository) {
        this.savedSchemeRepository = savedSchemeRepository;
    }

    @GetMapping("/upcoming")
    public ResponseEntity<Map<String, Object>> upcoming(@AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        LocalDate todayIst = LocalDate.now(IST_ZONE);

        List<Map<String, Object>> upcoming = savedSchemeRepository.findByUserOrderBySavedAtDesc(user)
            .stream()
            .filter(s -> !s.isReminderDismissed() && s.getEffectiveDeadline() != null)
            .filter(s -> s.getCustomDeadline() != null || s.isDeadlineVerified())
            .map(s -> {
                LocalDate deadline = s.getEffectiveDeadline();
                long daysRemaining = ChronoUnit.DAYS.between(todayIst, deadline);
                String status = daysRemaining < 0 ? "EXPIRED"
                    : (daysRemaining <= 3 ? "URGENT"
                    : (daysRemaining <= 7 ? "APPROACHING" : "FAR"));
                String badge = daysRemaining < 0 ? "GRAY"
                    : (daysRemaining <= 3 ? "RED"
                    : (daysRemaining <= 7 ? "AMBER" : "GREEN"));
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("schemeId", s.getSchemeId());
                item.put("schemeNameSnapshot", s.getSchemeNameSnapshot());
                item.put("deadlineDate", deadline.toString());
                item.put("daysRemaining", daysRemaining);
                item.put("status", status);
                item.put("badgeColor", badge);
                item.put("reminderEnabled", s.isReminderEnabled());
                item.put("acknowledged", s.getReminderAcknowledgedAt() != null);
                item.put("deadlineVerified", s.isDeadlineVerified() || s.getCustomDeadline() != null);
                return item;
            })
            .sorted(Comparator.comparingLong(m -> (Long) m.get("daysRemaining")))
            .toList();

        return ResponseEntity.ok(Map.of("upcomingDeadlines", upcoming));
    }

    @PostMapping("/{schemeId}/acknowledge")
    @Transactional
    public ResponseEntity<Map<String, Object>> acknowledge(
        @AuthenticationPrincipal User user,
        @PathVariable String schemeId
    ) {
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        SavedScheme s = savedSchemeRepository.findByUserAndSchemeId(user, schemeId).orElse(null);
        if (s == null) return ResponseEntity.status(404).body(Map.of("error", "Saved scheme not found"));
        s.setReminderAcknowledgedAt(LocalDateTime.now());
        savedSchemeRepository.save(s);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/{schemeId}/dismiss")
    @Transactional
    public ResponseEntity<Map<String, Object>> dismiss(
        @AuthenticationPrincipal User user,
        @PathVariable String schemeId
    ) {
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        SavedScheme s = savedSchemeRepository.findByUserAndSchemeId(user, schemeId).orElse(null);
        if (s == null) return ResponseEntity.status(404).body(Map.of("error", "Saved scheme not found"));
        s.setReminderDismissed(true);
        savedSchemeRepository.save(s);
        return ResponseEntity.ok(Map.of("success", true));
    }
}
