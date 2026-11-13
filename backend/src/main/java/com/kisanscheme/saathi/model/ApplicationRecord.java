package com.kisanscheme.saathi.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "applications")
public class ApplicationRecord {

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

    @Column(name = "readiness_snapshot")
    private Integer readinessSnapshot;

    @Column(name = "eligibility_snapshot", length = 40)
    private String eligibilitySnapshot;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ApplicationStatus status = ApplicationStatus.INTERESTED;

    @Column(name = "application_date")
    private LocalDateTime applicationDate;

    @Column(name = "applied_through_portal")
    private String appliedThroughPortal;

    @Column(name = "acknowledgement_number", length = 150)
    private String acknowledgementNumber;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @OneToMany(mappedBy = "application", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("timestamp ASC")
    private List<ApplicationTimelineEvent> timeline = new ArrayList<>();

    public ApplicationRecord() {}

    public ApplicationRecord(String id, User user, String schemeId, ApplicationStatus status) {
        this.id = id;
        this.user = user;
        this.schemeId = schemeId;
        this.status = status;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getSchemeId() { return schemeId; }
    public void setSchemeId(String schemeId) { this.schemeId = schemeId; }

    public String getSchemeNameSnapshot() { return schemeNameSnapshot; }
    public void setSchemeNameSnapshot(String schemeNameSnapshot) { this.schemeNameSnapshot = schemeNameSnapshot; }

    public Integer getReadinessSnapshot() { return readinessSnapshot; }
    public void setReadinessSnapshot(Integer readinessSnapshot) { this.readinessSnapshot = readinessSnapshot; }

    public String getEligibilitySnapshot() { return eligibilitySnapshot; }
    public void setEligibilitySnapshot(String eligibilitySnapshot) { this.eligibilitySnapshot = eligibilitySnapshot; }

    public ApplicationStatus getStatus() { return status; }
    public void setStatus(ApplicationStatus status) { this.status = status; }

    public LocalDateTime getApplicationDate() { return applicationDate; }
    public void setApplicationDate(LocalDateTime applicationDate) { this.applicationDate = applicationDate; }

    public String getAppliedThroughPortal() { return appliedThroughPortal; }
    public void setAppliedThroughPortal(String appliedThroughPortal) { this.appliedThroughPortal = appliedThroughPortal; }

    public String getAcknowledgementNumber() { return acknowledgementNumber; }
    public void setAcknowledgementNumber(String acknowledgementNumber) { this.acknowledgementNumber = acknowledgementNumber; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public List<ApplicationTimelineEvent> getTimeline() { return timeline; }
    public void setTimeline(List<ApplicationTimelineEvent> timeline) { this.timeline = timeline; }

    public void addTimelineEvent(ApplicationTimelineEvent event) {
        timeline.add(event);
        event.setApplication(this);
    }
}
