package com.kisanscheme.saathi.security;

import com.kisanscheme.saathi.model.AccountStatus;
import com.kisanscheme.saathi.model.User;
import com.kisanscheme.saathi.repository.UserRepository;
import com.kisanscheme.saathi.utils.IndianPhoneValidator;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        User user = resolveUserByIdentifier(identifier)
            .orElseThrow(() -> new UsernameNotFoundException("Farmer account not found"));

        boolean enabled = user.isPhoneVerified() && user.getAccountStatus() == AccountStatus.ACTIVE;

        return org.springframework.security.core.userdetails.User.builder()
            .username(user.getId())
            .password(user.getPasswordHash())
            .disabled(!enabled)
            .authorities(List.of(new SimpleGrantedAuthority("ROLE_FARMER")))
            .build();
    }

    public Optional<User> resolveUserByIdentifier(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            return Optional.empty();
        }
        String trimmed = identifier.trim();
        Optional<String> normalizedPhone = IndianPhoneValidator.normalizeToE164(trimmed);
        if (normalizedPhone.isPresent()) {
            return userRepository.findByPhoneNumber(normalizedPhone.get());
        }
        return userRepository.findByUsernameIgnoreCase(trimmed);
    }

    public Optional<User> loadByUserId(String userId) {
        return userRepository.findById(userId);
    }
}
