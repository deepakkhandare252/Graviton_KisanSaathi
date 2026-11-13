import { apiClient } from './api';
import { authService } from './authService';
import { ApplicationRecordItem, ApplicationStatus } from '../types/auth';
import { Scheme } from '../types/scheme';
import { VERIFIED_SCHEMES } from '../data/schemesData';

const GUEST_APPLICATIONS_KEY = 'kisan_guest_applications';

export interface ApplicationWithDetails extends ApplicationRecordItem {
  scheme?: Scheme | null;
}

export const applicationService = {
  getGuestApplications(): ApplicationWithDetails[] {
    try {
      const raw = localStorage.getItem(GUEST_APPLICATIONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  setGuestApplications(apps: ApplicationWithDetails[]): void {
    try {
      localStorage.setItem(GUEST_APPLICATIONS_KEY, JSON.stringify(apps));
    } catch (e) {
      console.warn('Failed to cache guest applications:', e);
    }
  },

  async getApplications(): Promise<ApplicationWithDetails[]> {
    const token = authService.getToken();
    if (!token) {
      return this.getGuestApplications();
    }

    // Security guarantee: when authenticated, NEVER expose un-scoped guest records
    const { data } = await apiClient.get<{ applications: ApplicationWithDetails[] }>('/applications');
    return data.applications || [];
  },

  async getApplicationById(id: string): Promise<ApplicationWithDetails | null> {
    const token = authService.getToken();
    if (!token) {
      return this.getGuestApplications().find((a) => a.id === id) || null;
    }

    const { data } = await apiClient.get<ApplicationWithDetails>(`/applications/${id}`);
    return data;
  },

  async createApplication(params: {
    schemeId: string;
    status?: ApplicationStatus;
    notes?: string;
    applicationDate?: string;
    appliedThroughPortal?: string;
    acknowledgementNumber?: string;
    readinessSnapshot?: {
      readyCount: number;
      totalMandatory: number;
      percentage: number;
    };
    eligibilitySnapshot?: {
      status: 'ELIGIBLE' | 'LIKELY_ELIGIBLE' | 'NOT_ELIGIBLE';
      evaluatedAt: string;
    };
  }): Promise<ApplicationWithDetails> {
    const token = authService.getToken();

    if (token) {
      const { data } = await apiClient.post<ApplicationWithDetails>('/applications', params);
      return data;
    }

    const scheme = VERIFIED_SCHEMES.find((s) => s.id === params.schemeId);
    const now = new Date().toISOString();
    const id = 'local_app_' + Date.now();
    const initialStatus = params.status || 'INTERESTED';
    const localApp: ApplicationWithDetails = {
      id,
      userId: 'guest',
      schemeId: params.schemeId,
      schemeNameSnapshot: scheme?.nameEn || params.schemeId,
      status: initialStatus,
      applicationDate: params.applicationDate || now,
      appliedThroughPortal: params.appliedThroughPortal || scheme?.officialPortalUrl,
      acknowledgementNumber: params.acknowledgementNumber,
      notes: params.notes,
      readinessSnapshot: params.readinessSnapshot,
      eligibilitySnapshot: params.eligibilitySnapshot,
      scheme: scheme || null,
      createdAt: now,
      updatedAt: now,
      timeline: [
        {
          id: 'time_' + Date.now(),
          applicationId: id,
          status: initialStatus,
          note: params.notes || 'Tracked in local storage',
          timestamp: now
        }
      ]
    };

    const existing = this.getGuestApplications();
    this.setGuestApplications([localApp, ...existing]);
    return localApp;
  },

  async updateApplication(
    id: string,
    updates: {
      status?: ApplicationStatus;
      notes?: string;
      applicationDate?: string;
      appliedThroughPortal?: string;
      acknowledgementNumber?: string;
      timelineNote?: string;
      readinessSnapshot?: {
        readyCount: number;
        totalMandatory: number;
        percentage: number;
      };
      eligibilitySnapshot?: {
        status: 'ELIGIBLE' | 'LIKELY_ELIGIBLE' | 'NOT_ELIGIBLE';
        evaluatedAt: string;
      };
    }
  ): Promise<ApplicationWithDetails | null> {
    const token = authService.getToken();

    if (token && !id.startsWith('local_app_')) {
      const { data } = await apiClient.patch<ApplicationWithDetails>(`/applications/${id}`, updates);
      return data;
    }

    const all = this.getGuestApplications();
    const idx = all.findIndex((a) => a.id === id);
    if (idx === -1) return null;

    const current = all[idx];
    const now = new Date().toISOString();
    const statusChanged = updates.status && updates.status !== current.status;

    const updatedApp: ApplicationWithDetails = {
      ...current,
      status: updates.status || current.status,
      notes: updates.notes !== undefined ? updates.notes : current.notes,
      applicationDate: updates.applicationDate !== undefined ? updates.applicationDate : current.applicationDate,
      appliedThroughPortal:
        updates.appliedThroughPortal !== undefined ? updates.appliedThroughPortal : current.appliedThroughPortal,
      acknowledgementNumber:
        updates.acknowledgementNumber !== undefined ? updates.acknowledgementNumber : current.acknowledgementNumber,
      readinessSnapshot: updates.readinessSnapshot ?? current.readinessSnapshot,
      eligibilitySnapshot: updates.eligibilitySnapshot ?? current.eligibilitySnapshot,
      updatedAt: now,
      timeline: [
        ...current.timeline,
        ...(statusChanged || updates.timelineNote
          ? [
              {
                id: 'time_' + Date.now(),
                applicationId: current.id,
                status: updates.status || current.status,
                note: updates.timelineNote || `Status updated to ${updates.status || current.status}`,
                timestamp: now
              }
            ]
          : [])
      ]
    };

    all[idx] = updatedApp;
    this.setGuestApplications(all);
    return updatedApp;
  },

  async deleteApplication(id: string): Promise<boolean> {
    const token = authService.getToken();
    if (token && !id.startsWith('local_app_')) {
      await apiClient.delete(`/applications/${id}`);
      return true;
    }

    const all = this.getGuestApplications();
    this.setGuestApplications(all.filter((a) => a.id !== id));
    return true;
  }
};
