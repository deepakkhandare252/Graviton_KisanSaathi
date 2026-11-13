package com.kisanscheme.saathi.controller;

import com.kisanscheme.saathi.model.AppNotification;
import com.kisanscheme.saathi.model.User;
import com.kisanscheme.saathi.repository.AppNotificationRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/notifications")
public class NotificationController {

    private final AppNotificationRepository notificationRepository;

    public NotificationController(AppNotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> list(@AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        List<AppNotification> list = notificationRepository.findByUserOrderByCreatedAtDesc(user);
        long unreadCount = notificationRepository.countByUserAndReadFalse(user);
        return ResponseEntity.ok(Map.of(
            "notifications", list.stream().map(this::toDto).toList(),
            "unreadCount", unreadCount
        ));
    }

    @PatchMapping("/{id}/read")
    @Transactional
    public ResponseEntity<Map<String, Object>> markRead(
        @AuthenticationPrincipal User user,
        @PathVariable String id
    ) {
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        AppNotification n = notificationRepository.findByIdAndUser(id, user).orElse(null);
        if (n == null) return ResponseEntity.status(404).body(Map.of("error", "Notification not found"));
        n.setRead(true);
        n.setReadAt(LocalDateTime.now());
        notificationRepository.save(n);
        return ResponseEntity.ok(Map.of("notification", toDto(n)));
    }

    @PostMapping("/read-all")
    @Transactional
    public ResponseEntity<Map<String, Object>> markAllRead(@AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        List<AppNotification> list = notificationRepository.findByUserOrderByCreatedAtDesc(user);
        LocalDateTime now = LocalDateTime.now();
        for (AppNotification n : list) {
            if (!n.isRead()) {
                n.setRead(true);
                n.setReadAt(now);
            }
        }
        notificationRepository.saveAll(list);
        return ResponseEntity.ok(Map.of("success", true));
    }

    private Map<String, Object> toDto(AppNotification n) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", n.getId());
        map.put("userId", n.getUser().getId());
        map.put("schemeId", n.getSchemeId());
        map.put("type", n.getType());
        map.put("title", n.getTitle());
        map.put("message", n.getMessage());
        map.put("urgency", n.getUrgency());
        map.put("daysRemaining", n.getDaysRemaining());
        map.put("channel", n.getChannel());
        map.put("isRead", n.isRead());
        map.put("readAt", n.getReadAt() != null ? n.getReadAt().toString() : null);
        map.put("createdAt", n.getCreatedAt().toString());
        return map;
    }
}
