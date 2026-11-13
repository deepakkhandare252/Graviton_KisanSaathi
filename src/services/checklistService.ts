import { DocumentPrerequisite } from '../types/scheme';
import { schemeService } from './schemeService';
import { request } from './api';

const CHECKLIST_STORAGE_KEY = 'kss_farmer_checklist';

export interface ChecklistItemStatus {
  documentId: string;
  isAvailable: boolean;
  notes?: string;
  lastUpdated: string;
}

export const checklistService = {
  /**
   * Retrieves prerequisites for a given scheme ID (API -> IndexedDB scheme cache).
   */
  async getSchemePrerequisites(schemeId: string): Promise<DocumentPrerequisite[]> {
    const isBrowserOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (!isBrowserOffline) {
      try {
        const data = await request<{ prerequisites: DocumentPrerequisite[] }>(`/schemes/${schemeId}/checklist`);
        if (data && Array.isArray(data.prerequisites)) {
          return data.prerequisites;
        }
      } catch {
        // Fallback to IndexedDB-backed schemeService
      }
    }

    const scheme = await schemeService.getSchemeById(schemeId);
    return scheme ? scheme.prerequisites : [];
  },

  /**
   * Loads saved local checklist status.
   */
  getSavedStatuses(): Record<string, ChecklistItemStatus> {
    try {
      const saved = localStorage.getItem(CHECKLIST_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  },

  /**
   * Toggles or updates status of a document checklist item.
   */
  toggleDocumentStatus(documentId: string, isAvailable: boolean): Record<string, ChecklistItemStatus> {
    const current = this.getSavedStatuses();
    current[documentId] = {
      documentId,
      isAvailable,
      lastUpdated: new Date().toISOString()
    };
    try {
      localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(current));
    } catch {
      // storage unavailable
    }
    return current;
  },

  /**
   * Computes overall readiness ratio for a set of prerequisites.
   */
  calculateReadiness(prerequisites: DocumentPrerequisite[]): {
    total: number;
    completed: number;
    missingMandatory: number;
    ratio: number;
  } {
    if (!prerequisites.length) return { total: 0, completed: 0, missingMandatory: 0, ratio: 100 };

    const statuses = this.getSavedStatuses();
    let completed = 0;
    let missingMandatory = 0;

    for (const item of prerequisites) {
      const isMarked = statuses[item.id]?.isAvailable;
      if (isMarked) {
        completed++;
      } else if (item.isMandatory) {
        missingMandatory++;
      }
    }

    const ratio = Math.round((completed / prerequisites.length) * 100);
    return {
      total: prerequisites.length,
      completed,
      missingMandatory,
      ratio
    };
  }
};
