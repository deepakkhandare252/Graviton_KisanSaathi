import { apiClient, TOKEN_KEY } from './api';
import { User, AuthResponse, OtpDispatchResponse, OtpPurpose } from '../types/auth';

export const authService = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },

  removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  },

  async register(params: {
    username: string;
    fullName: string;
    phoneNumber: string;
    password: string;
    confirmPassword: string;
    termsAccepted: boolean;
    preferredLanguage?: 'en' | 'kn';
    district?: string;
  }): Promise<OtpDispatchResponse> {
    const { data } = await apiClient.post<OtpDispatchResponse>('/auth/register', params);
    return data;
  },

  async sendOtp(phoneNumber: string, purpose: OtpPurpose = 'REGISTRATION'): Promise<OtpDispatchResponse> {
    const { data } = await apiClient.post<OtpDispatchResponse>('/auth/send-otp', {
      phoneNumber,
      purpose
    });
    return data;
  },

  async resendOtp(phoneNumber: string, purpose: OtpPurpose = 'REGISTRATION'): Promise<OtpDispatchResponse> {
    const { data } = await apiClient.post<OtpDispatchResponse>('/auth/resend-otp', {
      phoneNumber,
      purpose
    });
    return data;
  },

  async verifyOtp(params: {
    phoneNumber: string;
    otpCode: string;
    purpose?: OtpPurpose;
  }): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/verify-otp', {
      phoneNumber: params.phoneNumber,
      otpCode: params.otpCode,
      purpose: params.purpose || 'REGISTRATION'
    });
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  },

  async login(identifier: string, password: string): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', {
      identifier,
      password
    });
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  },

  async forgotPassword(phoneNumber: string): Promise<OtpDispatchResponse> {
    const { data } = await apiClient.post<OtpDispatchResponse>('/auth/forgot-password', {
      phoneNumber
    });
    return data;
  },

  async resetPassword(params: {
    phoneNumber: string;
    otpCode: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<{ success: boolean; message: string }> {
    const { data } = await apiClient.post<{ success: boolean; message: string }>('/auth/reset-password', params);
    return data;
  },

  async getCurrentUser(): Promise<User | null> {
    const token = this.getToken();
    if (!token) return null;
    try {
      const { data } = await apiClient.get<User>('/auth/me');
      return data;
    } catch {
      return null;
    }
  },

  async updateProfile(updates: {
    fullName?: string;
    preferredLanguage?: 'en' | 'kn';
    district?: string;
    timezone?: string;
    smsRemindersEnabled?: boolean;
  }): Promise<User> {
    const { data } = await apiClient.put<User>('/auth/profile', updates);
    return data;
  },

  async logout(): Promise<void> {
    const token = this.getToken();
    this.removeToken();
    if (token) {
      try {
        await apiClient.post('/auth/logout');
      } catch {
        // local token already cleared
      }
    }
  }
};
