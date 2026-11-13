package com.kisanscheme.saathi.service;

import com.kisanscheme.saathi.model.*;
import com.kisanscheme.saathi.repository.AppNotificationRepository;
import com.kisanscheme.saathi.repository.ReminderDispatchLogRepository;
import com.kisanscheme.saathi.repository.SavedSchemeRepository;
import com.kisanscheme.saathi.sms.SmsGatewayService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
public class DeadlineReminderScheduler {

    private static final ZoneId IST_ZONE = ZoneId.of("Asia/Kolkata");

    private final SavedSchemeRepository savedSchemeRepository;
    private final AppNotificationRepository notificationRepository;
    private final ReminderDispatchLogRepository dispatchLogRepository;
    private final SmsGatewayService smsGatewayService;

    public DeadlineReminderScheduler(
        SavedSchemeRepository savedSchemeRepository,
        AppNotificationRepository notificationRepository,
        ReminderDispatchLogRepository dispatchLogRepository,
        SmsGatewayService smsGatewayService
    ) {
        this.savedSchemeRepository = savedSchemeRepository;
        this.notificationRepository = notificationRepository;
        this.dispatchLogRepository = dispatchLogRepository;
        this.smsGatewayService = smsGatewayService;
    }

    @Scheduled(cron = "${kisan.scheduler.deadline-cron:0 0/30 * * * *}", zone = "Asia/Kolkata")
    @Transactional
    public void processUpcomingDeadlines() {
        LocalDate todayIst = LocalDate.now(IST_ZONE);
        List<SavedScheme> savedSchemes = savedSchemeRepository.findAll();

        for (SavedScheme saved : savedSchemes) {
            if (!saved.isReminderEnabled() || saved.isReminderDismissed()) {
                continue;
            }
            LocalDate deadline = saved.getEffectiveDeadline();
            if (deadline == null) {
                continue;
            }
            if (saved.getCustomDeadline() == null && !saved.isDeadlineVerified()) {
                continue;
            }
            User user = saved.getUser();
            if (user == null || user.getAccountStatus() != AccountStatus.ACTIVE) {
                continue;
            }

            long daysRemaining = ChronoUnit.DAYS.between(todayIst, deadline);
            if (daysRemaining < 0) {
                continue;
            }

            Integer matchedThreshold = resolveDueThreshold((int) daysRemaining, saved.getReminderDaysBefore());
            if (matchedThreshold == null) {
                continue;
            }

            boolean alreadySentInApp = dispatchLogRepository.existsByUserIdAndSchemeIdAndThresholdDaysAndTargetDeadlineAndChannel(
                user.getId(), saved.getSchemeId(), matchedThreshold, deadline, "IN_APP"
            );
            if (!alreadySentInApp) {
                String schemeName = saved.getSchemeNameSnapshot() != null ? saved.getSchemeNameSnapshot() : saved.getSchemeId();
                String urgency = daysRemaining <= 3 ? "RED" : (daysRemaining <= 7 ? "AMBER" : "GREEN");

                AppNotification notification = new AppNotification();
                notification.setId("notif_" + UUID.randomUUID());
                notification.setUser(user);
                notification.setSchemeId(saved.getSchemeId());
                notification.setType("DEADLINE_REMINDER");
                notification.setTitle(
                    daysRemaining == 0
                        ? "Deadline Today: " + schemeName
                        : "Closing in " + daysRemaining + " days: " + schemeName
                );
                notification.setMessage(
                    "Scheme \"" + schemeName + "\" application deadline is " + deadline + ". Check readiness and submit."
                );
                notification.setUrgency(urgency);
                notification.setDaysRemaining((int) daysRemaining);
                notification.setChannel("IN_APP");
                notification.setRead(false);
                notification.setCreatedAt(LocalDateTime.now());
                notificationRepository.save(notification);

                ReminderDispatchLog log = new ReminderDispatchLog();
                log.setId("rdl_" + UUID.randomUUID());
                log.setUserId(user.getId());
                log.setSchemeId(saved.getSchemeId());
                log.setThresholdDays(matchedThreshold);
                log.setTargetDeadline(deadline);
                log.setChannel("IN_APP");
                dispatchLogRepository.save(log);

                saved.setLastReminderSentAt(LocalDateTime.now());
                savedSchemeRepository.save(saved);
            }

            if (user.isSmsRemindersEnabled() && user.isPhoneVerified() && user.getPhoneNumber() != null) {
                boolean alreadySentSms = dispatchLogRepository.existsByUserIdAndSchemeIdAndThresholdDaysAndTargetDeadlineAndChannel(
                    user.getId(), saved.getSchemeId(), matchedThreshold, deadline, "SMS"
                );
                if (!alreadySentSms) {
                    String schemeName = saved.getSchemeNameSnapshot() != null ? saved.getSchemeNameSnapshot() : saved.getSchemeId();
                    String text = "Kisan Scheme Saathi Reminder: " + schemeName + " deadline is " + deadline
                        + " (" + daysRemaining + " days left).";
                    var smsOutcome = smsGatewayService.sendNotificationSms(user.getPhoneNumber(), text);
                    if (smsOutcome.delivered()) {
                        ReminderDispatchLog smsLog = new ReminderDispatchLog();
                        smsLog.setId("rdl_" + UUID.randomUUID());
                        smsLog.setUserId(user.getId());
                        smsLog.setSchemeId(saved.getSchemeId());
                        smsLog.setThresholdDays(matchedThreshold);
                        smsLog.setTargetDeadline(deadline);
                        smsLog.setChannel("SMS");
                        dispatchLogRepository.save(smsLog);
                    }
                }
            }
        }
    }

    private Integer resolveDueThreshold(int daysRemaining, String csvThresholds) {
        if (csvThresholds == null || csvThresholds.isBlank()) {
            csvThresholds = "30,7,3,1";
        }
        return Arrays.stream(csvThresholds.split(","))
            .map(String::trim)
            .filter(s -> !s.isBlank())
            .map(Integer::parseInt)
            .sorted()
            .filter(threshold -> daysRemaining <= threshold)
            .findFirst()
            .orElse(null);
    }
}
