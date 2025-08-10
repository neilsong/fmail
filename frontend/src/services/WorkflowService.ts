import { WorkflowTracker } from '@/WorkflowTracker';
import type { WorkflowSuggestion, UserAction } from '@/WorkflowTracker';

/**
 * Singleton service for managing a single WorkflowTracker instance
 * across the entire application to avoid multiple WebSocket connections
 */
class WorkflowService {
  private static instance: WorkflowService | null = null;
  private tracker: WorkflowTracker | null = null;
  private userId: string | null = null;

  private constructor() {
    // Private constructor to prevent direct instantiation
  }

  /**
   * Get the singleton instance of WorkflowService
   */
  static getInstance(): WorkflowService {
    if (!WorkflowService.instance) {
      WorkflowService.instance = new WorkflowService();
    }
    return WorkflowService.instance;
  }

  /**
   * Initialize the workflow tracker with a user ID
   * This should be called once when the user logs in or the app starts
   */
  initialize(userId: string): void {
    if (this.tracker && this.userId === userId) {
      // Already initialized for this user
      return;
    }

    // Disconnect existing tracker if switching users
    if (this.tracker) {
      this.tracker.disconnect();
    }

    this.userId = userId;
    this.tracker = new WorkflowTracker(userId);
    console.log(`WorkflowService initialized for user: ${userId}`);
  }

  /**
   * Track a user action using the singleton tracker
   */
  trackAction(action: Omit<UserAction, 'timestamp' | 'user_id' | 'session_id'>): void {
    if (!this.tracker) {
      console.warn('WorkflowService not initialized. Call initialize(userId) first.');
      return;
    }

    this.tracker.trackAction(action);
  }

  /**
   * Set callback for workflow suggestions
   */
  onSuggestion(callback: (suggestion: WorkflowSuggestion) => void): void {
    if (!this.tracker) {
      console.warn('WorkflowService not initialized. Call initialize(userId) first.');
      return;
    }

    this.tracker.onSuggestion(callback);
  }

  /**
   * Set callback for confirmation messages
   */
  onConfirmation(callback: (message: string) => void): void {
    if (!this.tracker) {
      console.warn('WorkflowService not initialized. Call initialize(userId) first.');
      return;
    }

    this.tracker.onConfirmation(callback);
  }

  /**
   * Respond to a workflow suggestion
   */
  respondToSuggestion(suggestionId: string, accepted: boolean): void {
    if (!this.tracker) {
      console.warn('WorkflowService not initialized. Call initialize(userId) first.');
      return;
    }

    this.tracker.respondToSuggestion(suggestionId, accepted);
  }

  /**
   * Check if the tracker is connected
   */
  isConnected(): boolean {
    return this.tracker !== null && this.tracker.isConnected();
  }

  /**
   * Get the current user ID
   */
  getCurrentUserId(): string | null {
    return this.userId;
  }

  /**
   * Disconnect and cleanup (e.g., on user logout)
   */
  disconnect(): void {
    if (this.tracker) {
      this.tracker.disconnect();
      this.tracker = null;
      this.userId = null;
      console.log('WorkflowService disconnected');
    }
  }
}

// Export the singleton instance
export const workflowService = WorkflowService.getInstance();

// Export types for convenience
export type { WorkflowSuggestion, UserAction } from '@/WorkflowTracker';
