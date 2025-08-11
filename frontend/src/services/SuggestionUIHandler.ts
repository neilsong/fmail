import { workflowService } from "./WorkflowService";
import type { WorkflowSuggestion } from "@/WorkflowTracker";

/**
 * Global UI handler for workflow suggestions
 * This ensures suggestion callbacks are set up only once, not in every component
 */
class SuggestionUIHandler {
  private static instance: SuggestionUIHandler | null = null;
  private initialized = false;
  private activeSuggestionToasts = new Map<string, string>();
  private toastManager: any = null;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): SuggestionUIHandler {
    if (!SuggestionUIHandler.instance) {
      SuggestionUIHandler.instance = new SuggestionUIHandler();
    }
    return SuggestionUIHandler.instance;
  }

  /**
   * Initialize the suggestion UI handler with toast manager
   * Should be called once when the app starts
   */
  initialize(toastManager: any): void {
    if (this.initialized) {
      console.log("🔄 SuggestionUIHandler already initialized, skipping...");
      return;
    }

    this.toastManager = toastManager;
    this.setupCallbacks();
    this.initialized = true;
    console.log("✅ SuggestionUIHandler initialized globally");
  }

  private setupCallbacks(): void {
    // Set up callback to clean up suggestion toasts
    workflowService.onSuggestionCleanup((suggestionId) => {
      const toastId = this.activeSuggestionToasts.get(suggestionId);
      if (toastId && this.toastManager) {
        console.log("🧹 SuggestionUIHandler: Closing suggestion toast:", suggestionId);
        this.toastManager.close(toastId);
        this.activeSuggestionToasts.delete(suggestionId);
      }
    });

    // Set up callback to handle workflow suggestions
    workflowService.onSuggestion((suggestion) => {
      this.handleSuggestion(suggestion);
    });

    // Set up callback for confirmation messages
    workflowService.onConfirmation((message) => {
      this.handleConfirmation(message);
    });
  }

  private handleSuggestion(suggestion: WorkflowSuggestion): void {
    if (!this.toastManager) {
      console.warn("⚠️ Toast manager not available, cannot display suggestion");
      return;
    }

    console.log("🎯 SuggestionUIHandler: Received workflow suggestion!", suggestion);

    // Display suggestion as a toast notification
    const toastId = this.toastManager.add({
      title: "Workflow Suggestion",
      description: suggestion.description,
      actionProps: {
        children: "Accept",
        onClick: () => {
          console.log("✅ User accepted suggestion:", suggestion.id);
          workflowService.respondToSuggestion(suggestion.id, true);

          // Remove from active suggestions tracking
          this.activeSuggestionToasts.delete(suggestion.id);

          // Add the workflow to the system
          try {
            const workflowHook = {
              name: `Auto-suggestion: ${suggestion.description}`,
              description: suggestion.description,
              trigger_event: suggestion.trigger_event as "email_received" | "email_closed" | "user_action",
              enabled: true,
              function_code: suggestion.generated_function,
            };

            const hookId = workflowService.addWorkflow(workflowHook);
            console.log("🔧 Added workflow with ID:", hookId);
          } catch (error) {
            console.error(" Error adding workflow:", error);
            this.toastManager.add({
              title: "Error",
              description: "Failed to add workflow. Please try again.",
              type: "error"
            });
          }
        }
      }
    });

    // Store toast ID for cleanup
    this.activeSuggestionToasts.set(suggestion.id, toastId);
    console.log(`📝 Stored toast ${toastId} for suggestion ${suggestion.id}`);
  }

  private handleConfirmation(message: string): void {
    if (!this.toastManager) {
      console.warn("⚠️ Toast manager not available, cannot display confirmation");
      return;
    }

    console.log("📢 SuggestionUIHandler: Received confirmation:", message);
    this.toastManager.add({
      title: "Workflow Update",
      description: message
    });
  }
}

// Export singleton instance
export const suggestionUIHandler = SuggestionUIHandler.getInstance();
