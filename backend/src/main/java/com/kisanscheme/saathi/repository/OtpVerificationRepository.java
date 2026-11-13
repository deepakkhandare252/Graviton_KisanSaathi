package com.kisanscheme.saathi.repository;

import com.kisanscheme.saathi.model.OtpPurpose;
import com.kisanscheme.saathi.model.OtpVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OtpVerificationRepository extends JpaRepository<OtpVerification, String> {
    Optional<OtpVerification> findTopByPhoneNumberAndPurposeAndInvalidatedFalseAndUsedAtIsNullOrderByCreatedAtDesc(
        String phoneNumber,
        OtpPurpose purpose
    );

    List<OtpVerification> findByPhoneNumberAndPurposeAndInvalidatedFalseAndUsedAtIsNull(
        String phoneNumber,
        OtpPurpose purpose
    );

    long countByPhoneNumberAndPurposeAndCreatedAtAfter(
        String phoneNumber,
        OtpPurpose purpose,
        LocalDateTime since
    );
}
