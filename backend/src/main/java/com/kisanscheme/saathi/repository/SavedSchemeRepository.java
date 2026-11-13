package com.kisanscheme.saathi.repository;

import com.kisanscheme.saathi.model.SavedScheme;
import com.kisanscheme.saathi.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SavedSchemeRepository extends JpaRepository<SavedScheme, String> {
    List<SavedScheme> findByUserOrderBySavedAtDesc(User user);
    Optional<SavedScheme> findByUserAndSchemeId(User user, String schemeId);
    void deleteByUserAndSchemeId(User user, String schemeId);
}
