package com.kisanscheme.saathi.repository;

import com.kisanscheme.saathi.model.ReminderDispatchLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;

@Repository
public interface ReminderDispatchLogRepository extends JpaRepository<ReminderDispatchLog, String> {
    boolean existsByUserIdAndSchemeIdAndThresholdDaysAndTargetDeadlineAndChannel(
        String userId,
        String schemeId,
        int thresholdDays,
        LocalDate targetDeadline,
        String channel
    );
}
