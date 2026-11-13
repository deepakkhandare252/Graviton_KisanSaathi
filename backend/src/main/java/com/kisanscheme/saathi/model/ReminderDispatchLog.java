package com.kisanscheme.saathi.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "reminder_dispatch_logs", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "scheme_id", "threshold_days", "target_deadline", "channel"})
})
public class ReminderDispatchLog {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "user_id", nullable = false, length = 36)
    private String userId;

    @Column(name = "scheme_id", nullable = false, length = 100)
    private String schemeId;

    @Column(name = "threshold_days", nullable = false)
    private int thresholdDays;

    @Column(name = "target_deadline", nullable = false)
    private LocalDate targetDeadline;

    @Column(nullable = false, length = 20)
    private String channel = "IN_APP";

    @Column(name = "dispatched_at", nullable = false, updatable = false)
    private LocalDateTime dispatchedAt = LocalDateTime.now();

    public ReminderDispatchLog() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getSchemeId() { return schemeId; }
    public void setSchemeId(String schemeId) { this.schemeId = schemeId; }

    public int getThresholdDays() { return thresholdDays; }
    public void setThresholdDays(int thresholdDays) { this.thresholdDays = thresholdDays; }

    public LocalDate getTargetDeadline() { return targetDeadline; }
    public void setTargetDeadline(LocalDate targetDeadline) { this.targetDeadline = targetDeadline; }

    public String getChannel() { return channel; }
    public void setChannel(String channel) { this.channel = channel; }

    public LocalDateTime getDispatchedAt() { return dispatchedAt; }
    public void setDispatchedAt(LocalDateTime dispatchedAt) { this.dispatchedAt = dispatchedAt; }
}
