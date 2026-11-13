import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PUBLIC_SCHEME_STALE_MS,
  USER_DYNAMIC_STALE_MS,
  NOTIFICATIONS_STALE_MS,
  queryKeys
} from '../lib/queryClient';
import { schemeService } from '../services/schemeService';
import { checklistService } from '../services/checklistService';
import { savedSchemeService } from '../services/savedSchemeService';
import { applicationService } from '../services/applicationService';
import { notificationService } from '../services/notificationService';
import { reminderService } from '../services/reminderService';
import { useAuth } from '../contexts/AuthContext';
import { ApplicationStatus } from '../types/auth';

export function useSchemesCatalog() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.schemes,
    queryFn: () => schemeService.getAllSchemes(),
    staleTime: PUBLIC_SCHEME_STALE_MS
  });

  const forceRefresh = async () => {
    await qc.invalidateQueries({ queryKey: queryKeys.schemes });
    return query.refetch();
  };

  return {
    ...query,
    schemes: query.data?.schemes ?? [],
    isOfflineData: query.data?.isOffline ?? false,
    dataSource: query.data?.source ?? 'bundled',
    cachedTimestamp: query.data?.cachedTimestamp ?? null,
    sourceVersion: query.data?.sourceVersion ?? '2026.5-KAR',
    lastVerifiedDate: query.data?.lastVerifiedDate ?? '2026-11-10',
    forceRefresh
  };
}

export function useSchemeById(schemeId: string) {
  return useQuery({
    queryKey: queryKeys.scheme(schemeId),
    queryFn: () => schemeService.getSchemeById(schemeId),
    enabled: Boolean(schemeId),
    staleTime: PUBLIC_SCHEME_STALE_MS
  });
}

export function useSchemeChecklist(schemeId: string) {
  return useQuery({
    queryKey: queryKeys.checklist(schemeId),
    queryFn: () => checklistService.getSchemePrerequisites(schemeId),
    enabled: Boolean(schemeId),
    staleTime: PUBLIC_SCHEME_STALE_MS
  });
}

export function useSchemeApplicationGuide(schemeId: string) {
  return useQuery({
    queryKey: queryKeys.applicationGuide(schemeId),
    queryFn: () => schemeService.getApplicationGuide(schemeId),
    enabled: Boolean(schemeId),
    staleTime: PUBLIC_SCHEME_STALE_MS
  });
}

export function useUserIdentityKey(): string {
  const { user, token } = useAuth();
  if (!token || !user?.id) return 'guest';
  return user.id;
}

export function useApplicationsQuery() {
  const userId = useUserIdentityKey();
  return useQuery({
    queryKey: queryKeys.applications(userId),
    queryFn: () => applicationService.getApplications(),
    staleTime: USER_DYNAMIC_STALE_MS,
    refetchOnWindowFocus: true
  });
}

export function useApplicationByIdQuery(applicationId: string) {
  const userId = useUserIdentityKey();
  return useQuery({
    queryKey: queryKeys.application(userId, applicationId),
    queryFn: () => applicationService.getApplicationById(applicationId),
    enabled: Boolean(applicationId),
    staleTime: USER_DYNAMIC_STALE_MS
  });
}

export function useApplicationMutations() {
  const qc = useQueryClient();
  const userId = useUserIdentityKey();

  const createMutation = useMutation({
    mutationFn: applicationService.createApplication,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.applications(userId) });
      qc.invalidateQueries({ queryKey: queryKeys.notifications(userId) });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (args: {
      id: string;
      updates: {
        status?: ApplicationStatus;
        notes?: string;
        applicationDate?: string;
        appliedThroughPortal?: string;
        acknowledgementNumber?: string;
        timelineNote?: string;
      };
    }) => applicationService.updateApplication(args.id, args.updates),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.applications(userId) });
      qc.invalidateQueries({ queryKey: queryKeys.application(userId, vars.id) });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => applicationService.deleteApplication(id),
    onSuccess: (_ok, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.applications(userId) });
      qc.removeQueries({ queryKey: queryKeys.application(userId, id) });
    }
  });

  return {
    createApplication: createMutation.mutateAsync,
    updateApplication: updateMutation.mutateAsync,
    deleteApplication: deleteMutation.mutateAsync
  };
}

export function useSavedSchemesQuery() {
  const userId = useUserIdentityKey();
  return useQuery({
    queryKey: queryKeys.savedSchemes(userId),
    queryFn: () => savedSchemeService.getSavedSchemes(),
    staleTime: USER_DYNAMIC_STALE_MS
  });
}

export function useNotificationsQuery(enabled: boolean) {
  const userId = useUserIdentityKey();
  return useQuery({
    queryKey: queryKeys.notifications(userId),
    queryFn: () => notificationService.getNotifications(),
    enabled: enabled && userId !== 'guest',
    staleTime: NOTIFICATIONS_STALE_MS,
    refetchOnWindowFocus: true
  });
}

export function useRemindersQuery() {
  const userId = useUserIdentityKey();
  return useQuery({
    queryKey: queryKeys.reminders(userId),
    queryFn: () => reminderService.getUpcomingDeadlines(),
    staleTime: USER_DYNAMIC_STALE_MS,
    refetchOnWindowFocus: true
  });
}
