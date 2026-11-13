package com.kisanscheme.saathi.repository;

import com.kisanscheme.saathi.model.ApplicationRecord;
import com.kisanscheme.saathi.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ApplicationRecordRepository extends JpaRepository<ApplicationRecord, String> {
    List<ApplicationRecord> findByUserOrderByUpdatedAtDesc(User user);
    Optional<ApplicationRecord> findByIdAndUser(String id, User user);
    void deleteByIdAndUser(String id, User user);
}
