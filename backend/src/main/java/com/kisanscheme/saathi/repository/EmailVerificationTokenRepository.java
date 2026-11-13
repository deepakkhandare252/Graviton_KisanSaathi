package com.kisanscheme.saathi.repository;

import com.kisanscheme.saathi.model.EmailVerificationToken;
import com.kisanscheme.saathi.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, String> {
    Optional<EmailVerificationToken> findByToken(String token);
    Optional<EmailVerificationToken> findByUserAndUsedAtIsNull(User user);
}
