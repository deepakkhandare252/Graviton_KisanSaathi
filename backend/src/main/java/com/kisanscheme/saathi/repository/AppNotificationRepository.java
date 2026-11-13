package com.kisanscheme.saathi.repository;

import com.kisanscheme.saathi.model.AppNotification;
import com.kisanscheme.saathi.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AppNotificationRepository extends JpaRepository<AppNotification, String> {
    List<AppNotification> findByUserOrderByCreatedAtDesc(User user);
    long countByUserAndReadFalse(User user);
    Optional<AppNotification> findByIdAndUser(String id, User user);
}
