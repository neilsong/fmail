import { workflowExecutor, type WorkflowHook, type WorkflowResult, type WorkflowContext } from "./WorkflowExecutor";
import { WorkflowTracker, type UserAction, type WorkflowSuggestion } from "../WorkflowTracker";
import { useEmailStore } from "@/store/useEmailStore";
import type { Email } from "@/store/email.schema";

/**
 * Enhanced singleton service for managing workflows and tracking
 * Now handles both tracking and workflow execution on the frontend
 */
class WorkflowService {
  private static instance: WorkflowService | null = null;
  private tracker: WorkflowTracker | null = null;
  private userId: string | null = null;
  private sessionId: string = crypto.randomUUID();
  private debounceTimer: NodeJS.Timeout | null = null;
  private pendingActions: Array<Omit<UserAction, "timestamp" | "user_id" | "session_id">> = [];
  private readonly DEBOUNCE_DELAY = 500; // 500ms debounce delay
  private activeSuggestionIds: Set<string> = new Set();
  private suggestionCleanupCallback?: (suggestionId: string) => void;

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
    this.sessionId = crypto.randomUUID();
    this.tracker = new WorkflowTracker(userId);
    console.log(`WorkflowService initialized for user: ${userId}`);
  }

  /**
   * Track a user action with debouncing to prevent overwhelming the LLM
   */
  async trackAction(action: Omit<UserAction, "timestamp" | "user_id" | "session_id">): Promise<void> {
    if (!this.tracker) {
      console.warn("WorkflowService not initialized. Call initialize(userId) first.");
      return;
    }

    console.log("📊 WorkflowService: Queuing action for debounced tracking:", action.action, "on email from", action.email.sender);
    
    // Add action to pending queue
    this.pendingActions.push(action);
    
    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      console.log("⏱️ Cancelled previous debounce timer - new action received");
    }
    
    // Set new debounce timer
    this.debounceTimer = setTimeout(() => {
      this.processPendingActions();
    }, this.DEBOUNCE_DELAY);
    
    console.log(`⏱️ Debounce timer set for ${this.DEBOUNCE_DELAY}ms with ${this.pendingActions.length} pending actions`);
  }

  /**
   * Process all pending actions after debounce delay
   */
  private async processPendingActions(): Promise<void> {
    if (this.pendingActions.length === 0) {
      return;
    }

    console.log(`🚀 Processing ${this.pendingActions.length} debounced actions`);
    
    // Get the most recent action for LLM analysis (to avoid redundant suggestions)
    const mostRecentAction = this.pendingActions[this.pendingActions.length - 1];
    
    // Send all actions to backend for tracking, but only analyze the most recent for suggestions
    for (const action of this.pendingActions) {
      console.log("📊 Sending action to backend:", action.action, "on email from", action.email.sender);
      this.tracker!.trackAction(action);
    }
    
    console.log("📊 Actions sent to backend via WebSocket - analyzing most recent for suggestions...");
    
    // Execute workflows for the most recent action only
    if (this.userId && workflowExecutor.shouldAnalyzeForPatterns(mostRecentAction as UserAction)) {
      const context: WorkflowContext = {
        user_id: this.userId,
        location: mostRecentAction.context.location,
        time_of_day: new Date().getHours(),
        day_of_week: new Date().getDay(),
        session_id: this.sessionId
      };

      try {
        const results = await workflowExecutor.executeActionWorkflows(mostRecentAction as UserAction, context);
        this.handleWorkflowResults(results);
      } catch (error) {
        console.error('Error executing action workflows:', error);
      }
    }
    
    // Clear pending actions
    this.pendingActions = [];
    this.debounceTimer = null;
  }

  /**
   * Set callback for workflow suggestions with cleanup support
   */
  onSuggestion(callback: (suggestion: WorkflowSuggestion) => void): void {
    if (!this.tracker) {
      console.warn("WorkflowService not initialized. Call initialize(userId) first.");
      return;
    }

    console.log("🔗 WorkflowService: Setting up suggestion callback");
    this.tracker.onSuggestion((suggestion: WorkflowSuggestion) => {
      console.log("🚀 WorkflowService: Forwarding suggestion to UI callback:", suggestion.description);
      
      // Clean up old suggestions before showing new one
      this.cleanupOldSuggestions();
      
      // Track this new suggestion
      this.activeSuggestionIds.add(suggestion.id);
      console.log(`📝 Tracking suggestion ${suggestion.id}, total active: ${this.activeSuggestionIds.size}`);
      
      callback(suggestion);
    });
  }

  /**
   * Set callback for cleaning up suggestions in the UI
   */
  onSuggestionCleanup(callback: (suggestionId: string) => void): void {
    this.suggestionCleanupCallback = callback;
    console.log("🧹 WorkflowService: Suggestion cleanup callback registered");
  }

  /**
   * Clean up old suggestions when new ones arrive
   */
  private cleanupOldSuggestions(): void {
    if (this.activeSuggestionIds.size > 0 && this.suggestionCleanupCallback) {
      console.log(`🧹 Cleaning up ${this.activeSuggestionIds.size} old suggestions`);
      
      for (const suggestionId of this.activeSuggestionIds) {
        this.suggestionCleanupCallback(suggestionId);
        console.log(`🗑️ Cleaned up suggestion: ${suggestionId}`);
      }
      
      this.activeSuggestionIds.clear();
    }
  }

  /**
   * Set callback for confirmation messages
   */
  onConfirmation(callback: (message: string) => void): void {
    if (!this.tracker) {
      console.warn("WorkflowService not initialized. Call initialize(userId) first.");
      return;
    }

    this.tracker.onConfirmation(callback);
  }

  /**
   * Respond to a workflow suggestion
   */
  respondToSuggestion(suggestionId: string, accepted: boolean): void {
    if (!this.tracker) {
      console.warn("WorkflowService not initialized. Call initialize(userId) first.");
      return;
    }

    this.tracker.respondToSuggestion(suggestionId, accepted);
  }

  /**
   * Handle incoming email and execute workflows
   */
  async handleIncomingEmail(email: Email): Promise<WorkflowResult[]> {
    if (!this.userId) {
      console.warn("WorkflowService not initialized. Call initialize(userId) first.");
      return [];
    }

    const context: WorkflowContext = {
      user_id: this.userId,
      location: 'home', // Incoming emails are typically processed in the background
      time_of_day: new Date().getHours(),
      day_of_week: new Date().getDay(),
      session_id: this.sessionId
    };

    try {
      const results = await workflowExecutor.executeEmailWorkflows(email, context);
      this.handleWorkflowResults(results);
      return results;
    } catch (error) {
      console.error('Error executing email workflows:', error);
      return [];
    }
  }

  /**
   * Handle email closing and execute workflows
   */
  async handleEmailClose(email: Email, location: 'home' | 'detail' = 'detail'): Promise<WorkflowResult[]> {
    if (!this.userId) {
      console.warn("WorkflowService not initialized. Call initialize(userId) first.");
      return [];
    }

    const context: WorkflowContext = {
      user_id: this.userId,
      location: location,
      time_of_day: new Date().getHours(),
      day_of_week: new Date().getDay(),
      session_id: this.sessionId
    };

    try {
      const results = await workflowExecutor.executeEmailCloseWorkflows(email, context);
      this.handleWorkflowResults(results);
      return results;
    } catch (error) {
      console.error('Error executing email close workflows:', error);
      return [];
    }
  }

  /**
   * Handle workflow execution results
   */
  private handleWorkflowResults(results: WorkflowResult[]): void {
    results.forEach(result => {
      if (result.success && result.actions_taken.length > 0) {
        console.log(`Workflow ${result.hook_id} executed successfully:`, result.actions_taken);
        this.applyWorkflowActions(result.hook_id, result.actions_taken, result.email_id);
      } else if (!result.success) {
        console.error(`Workflow ${result.hook_id} failed:`, result.error);
      }
    });
  }

  /**
   * Apply workflow actions to the email store and show user feedback
   */
  private applyWorkflowActions(hookId: string, actions: string[], emailId?: string): void {
    if (!emailId) {
      console.warn("Cannot apply workflow actions: email ID not provided");
      return;
    }

    const emailStore = useEmailStore.getState();
    const numericEmailId = parseInt(emailId, 10);
    
    if (isNaN(numericEmailId)) {
      console.warn(`Invalid email ID for workflow actions: ${emailId}`);
      return;
    }

    let actionsApplied: string[] = [];

    actions.forEach(action => {
      try {
        if (action === 'delete') {
          emailStore.deleteEmail(numericEmailId);
          actionsApplied.push('deleted');
        } else if (action === 'archive') {
          emailStore.moveEmail(numericEmailId, 'archive' as any);
          actionsApplied.push('archived');
        } else if (action === 'star') {
          emailStore.toggleStarred(numericEmailId);
          actionsApplied.push('starred');
        } else if (action === 'unstar') {
          emailStore.toggleStarred(numericEmailId);
          actionsApplied.push('unstarred');
        } else if (action === 'mark_read') {
          emailStore.markAsRead(numericEmailId, true);
          actionsApplied.push('marked as read');
        } else if (action === 'mark_unread') {
          emailStore.markAsRead(numericEmailId, false);
          actionsApplied.push('marked as unread');
        } else if (action.startsWith('add_label:')) {
          const label = action.split(':')[1];
          if (label) {
            // Map string labels to EmailTag enum values
            const labelMap: Record<string, any> = {
              'important': 'important',
              'work': 'work', 
              'personal': 'personal',
              'finance': 'finance',
              'travel': 'travel',
              'shopping': 'shopping',
              'promotions': 'promotions'
            };
            const emailTag = labelMap[label.toLowerCase()];
            if (emailTag) {
              emailStore.addTag(numericEmailId, emailTag);
              actionsApplied.push(`labeled as ${label}`);
            }
          }
        } else if (action.startsWith('remove_label:')) {
          const label = action.split(':')[1];
          if (label) {
            const labelMap: Record<string, any> = {
              'important': 'important',
              'work': 'work',
              'personal': 'personal', 
              'finance': 'finance',
              'travel': 'travel',
              'shopping': 'shopping',
              'promotions': 'promotions'
            };
            const emailTag = labelMap[label.toLowerCase()];
            if (emailTag) {
              emailStore.removeTag(numericEmailId, emailTag);
              actionsApplied.push(`removed ${label} label`);
            }
          }
        } else if (action === 'move_to_spam') {
          emailStore.moveEmail(numericEmailId, 'spam' as any);
          actionsApplied.push('moved to spam');
        } else if (action === 'move_to_trash') {
          emailStore.moveEmail(numericEmailId, 'trash' as any);
          actionsApplied.push('moved to trash');
        }
      } catch (error) {
        console.error(`Failed to apply workflow action ${action}:`, error);
      }
    });

    // Show user feedback if any actions were applied
    if (actionsApplied.length > 0) {
      this.showWorkflowFeedback(actionsApplied, hookId);
    }
  }

  /**
   * Show toast notification when workflow takes actions automatically
   */
  private showWorkflowFeedback(actionsApplied: string[], hookId: string): void {
    // Import toast manager dynamically to avoid circular dependencies
    import('@/hooks/use-toast').then((toastModule) => {
      const actionText = actionsApplied.length === 1 
        ? actionsApplied[0]
        : `${actionsApplied.length} actions: ${actionsApplied.join(', ')}`;

      toastModule.toastManager.add({
        title: "🤖 Workflow Executed",
        description: `Automatically ${actionText}`,
      });

      console.log(`🤖 Workflow ${hookId} automatically: ${actionText}`);
    }).catch(error => {
      console.error("Failed to show workflow feedback toast:", error);
    });
  }

  /**
   * Workflow management methods
   */
  addWorkflow(workflow: Omit<WorkflowHook, 'id' | 'created_at' | 'execution_count'>): string {
    const hookId = workflowExecutor.addHook(workflow);
    
    // Clean up any active suggestions since user created a workflow
    console.log("🔧 Workflow added, cleaning up active suggestions");
    this.cleanupOldSuggestions();
    
    // Send current workflows to backend for LLM context
    this.sendCurrentWorkflowsToBackend();
    
    return hookId;
  }

  getWorkflows(): WorkflowHook[] {
    return workflowExecutor.getHooks();
  }

  toggleWorkflow(hookId: string, enabled: boolean): boolean {
    return workflowExecutor.toggleHook(hookId, enabled);
  }

  deleteWorkflow(hookId: string): boolean {
    const success = workflowExecutor.deleteHook(hookId);
    if (success) {
      this.sendCurrentWorkflowsToBackend();
    }
    return success;
  }

  /**
   * Send current workflows to backend for LLM context
   */
  private sendCurrentWorkflowsToBackend(): void {
    if (!this.tracker) return;
    
    const workflows = workflowExecutor.getCurrentWorkflows();
    // Send via WebSocket to backend
    // The backend can use this info when generating new suggestions
    try {
      this.tracker.sendMessage({
        type: 'current_workflows',
        workflows: workflows
      });
    } catch (error) {
      console.error('Error sending workflows to backend:', error);
    }
  }

  /**
   * Check if the tracker is connected
   */
  isConnected(): boolean {
    return this.tracker !== null;
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
      console.log("WorkflowService disconnected");
    }
  }
}

// Export the singleton instance
export const workflowService = WorkflowService.getInstance();

// Export types for convenience
export type { UserAction, WorkflowSuggestion } from "@/WorkflowTracker";
