package com.kisanscheme.saathi.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "saved_schemes", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "scheme_id"})
})
public class SavedScheme {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "scheme_id", nullable = false, length = 100)
    private String schemeId;

    @Column(name = "scheme_name_snapshot", length = 255)
    private String schemeNameSnapshot;

    @Column(name = "application_deadline")
    private LocalDate applicationDeadline;

    @Column(name = "deadline_verified", nullable = false)
    private boolean deadlineVerified = false;

    @Column(name = "custom_deadline")
    private LocalDate customDeadline;

    @Column(name = "reminder_enabled", nullable = false)
    private boolean reminderEnabled = true;

    @Column(name = "reminder_days_before", nullable = false, length = 64)
    private String reminderDaysBefore = "30,7,3,1";

    @Column(name = "last_reminder_sent_at")
    private LocalDateTime lastReminderSentAt;

    @Column(name = "reminder_acknowledged_at")
    private LocalDateTime reminderAcknowledgedAt;

    @Column(name = "reminder_dismissed", nullable = false)
    private boolean reminderDismissed = false;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "user_notes", columnDefinition = "TEXT")
    private String userNotes;

    @Column(name = "saved_at", nullable = false, updatable = false)
    private LocalDateTime savedAt = LocalDateTime.now();

    public SavedScheme() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getSchemeId() { return schemeId; }
    public void setSchemeId(String schemeId) { this.schemeId = schemeId; }

    public String getSchemeNameSnapshot() { return schemeNameSnapshot; }
    public void setSchemeNameSnapshot(String schemeNameSnapshot) { this.schemeNameSnapshot = schemeNameSnapshot; }

    public LocalDate getApplicationDeadline() { return applicationDeadline; }
    public void setApplicationDeadline(LocalDate applicationDeadline) { this.applicationDeadline = applicationDeadline; }

    public boolean isDeadlineVerified() { return deadlineVerified; }
    public void setDeadlineVerified(boolean deadlineVerified) { this.deadlineVerified = deadlineVerified; }

    public LocalDate getCustomDeadline() { return customDeadline; }
    public void setCustomDeadline(LocalDate customDeadline) { this.customDeadline = customDeadline; }

    public boolean isReminderEnabled() { return reminderEnabled; }
    public void setReminderEnabled(boolean reminderEnabled) { this.reminderEnabled = reminderEnabled; }

    public String getReminderDaysBefore() { return reminderDaysBefore; }
    public void setReminderDaysBefore(String reminderDaysBefore) { this.reminderDaysBefore = reminderDaysBefore; }

    public LocalDateTime getLastReminderSentAt() { return lastReminderSentAt; }
    public void setLastReminderSentAt(LocalDateTime lastReminderSentAt) { this.lastReminderSentAt = lastReminderSentAt; }

    public LocalDateTime getReminderAcknowledgedAt() { return reminderAcknowledgedAt; }
    public void setReminderAcknowledgedAt(LocalDateTime reminderAcknowledgedAt) { this.reminderAcknowledgedAt = reminderAcknowledgedAt; }

    public boolean isReminderDismissed() { return reminderDismissed; }
    public void setReminderDismissed(boolean reminderDismissed) { this.reminderDismissed = reminderDismissed; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getUserNotes() { return userNotes; }
    public void setUserNotes(String userNotes) { this.userNotes = userNotes; }

    public LocalDateTime getSavedAt() { return savedAt; }
    public void setSavedAt(LocalDateTime savedAt) { this.savedAt = savedAt; }

    public LocalDate getEffectiveDeadline() {
        return customDeadline != null ? customDeadline : applicationDeadline;
    }
}
