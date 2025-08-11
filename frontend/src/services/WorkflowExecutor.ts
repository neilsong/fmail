import type { UserAction } from "@/WorkflowTracker";
import type { Email } from "@/store/email.schema";

// Types for workflow system
// Note: Using the Zod schema Email type directly

// Re-export Email type for other modules
export type { Email };

export interface WorkflowContext {
  user_id: string;
  location: 'home' | 'detail' | 'unknown';
  time_of_day: number; // 0-23
  day_of_week: number; // 0-6 (Sunday = 0)
  session_id: string;
}

export interface WorkflowHook {
  id: string;
  name: string;
  description: string;
  trigger_event: 'email_received' | 'email_closed' | 'user_action';
  enabled: boolean;
  function_code: string;
  created_at: Date;
  execution_count: number;
  last_executed?: Date;
  conditions?: {
    sender_patterns?: string[];
    subject_patterns?: string[];
    label_conditions?: string[];
  };
}

export interface WorkflowResult {
  hook_id: string;
  success: boolean;
  actions_taken: string[];
  email_id?: string;
  error?: string;
  execution_time: number;
}

// Safe email API for workflow functions
class WorkflowEmailAPI {
  private email: Email;
  private actionsTaken: string[] = [];

  constructor(email: Email) {
    this.email = { ...email }; // Create a copy to prevent mutations
  }

  // Read-only properties (mapped to schema fields)
  get id() { return String(this.email.id); }
  get sender() { return this.email.from; }
  get subject() { return this.email.subject; }
  get body() { return this.email.preview || ''; }
  get labels() { return [...this.email.tags.map(tag => String(tag))]; }
  get is_read() { return !this.email.unread; }
  get is_starred() { return this.email.starred; }
  get received_at() { return new Date(this.email.time); }
  get attachments() { return this.email.hasAttachment ? ['attachment'] : []; }

  // Actions that can be taken on emails
  archive(): void {
    this.actionsTaken.push('archive');
    console.log(`[Workflow] Archive email ${this.email.id}`);
  }

  delete(): void {
    this.actionsTaken.push('delete');
    console.log(`[Workflow] Delete email ${this.email.id}`);
  }

  star(): void {
    this.actionsTaken.push('star');
    console.log(`[Workflow] Star email ${this.email.id}`);
  }

  unstar(): void {
    this.actionsTaken.push('unstar');
    console.log(`[Workflow] Unstar email ${this.email.id}`);
  }

  markRead(): void {
    this.actionsTaken.push('mark_read');
    console.log(`[Workflow] Mark read email ${this.email.id}`);
  }

  markUnread(): void {
    this.actionsTaken.push('mark_unread');
    console.log(`[Workflow] Mark unread email ${this.email.id}`);
  }

  addLabel(label: string): void {
    if (label && typeof label === 'string') {
      this.actionsTaken.push(`add_label:${label}`);
      console.log(`[Workflow] Add label "${label}" to email ${this.email.id}`);
    }
  }

  removeLabel(label: string): void {
    if (label && typeof label === 'string') {
      this.actionsTaken.push(`remove_label:${label}`);
      console.log(`[Workflow] Remove label "${label}" from email ${this.email.id}`);
    }
  }

  moveToSpam(): void {
    this.actionsTaken.push('move_to_spam');
    console.log(`[Workflow] Move email ${this.email.id} to spam`);
  }

  moveToTrash(): void {
    this.actionsTaken.push('move_to_trash');
    console.log(`[Workflow] Move email ${this.email.id} to trash`);
  }

  getActionsTaken(): string[] {
    return [...this.actionsTaken];
  }
}

// Safe context API for workflow functions
class WorkflowContextAPI {
  private context: WorkflowContext;

  constructor(context: WorkflowContext) {
    this.context = { ...context };
  }

  get user_id() { return this.context.user_id; }
  get location() { return this.context.location; }
  get time_of_day() { return this.context.time_of_day; }
  get day_of_week() { return this.context.day_of_week; }
  get session_id() { return this.context.session_id; }

  isWeekend(): boolean {
    return this.context.day_of_week === 0 || this.context.day_of_week === 6;
  }

  isBusinessHours(): boolean {
    return this.context.time_of_day >= 9 && this.context.time_of_day <= 17;
  }
}

// Utility functions available in workflow functions
const workflowUtils = {
  // String matching utilities
  contains(text: string, pattern: string): boolean {
    return text.toLowerCase().includes(pattern.toLowerCase());
  },

  startsWith(text: string, pattern: string): boolean {
    return text.toLowerCase().startsWith(pattern.toLowerCase());
  },

  endsWith(text: string, pattern: string): boolean {
    return text.toLowerCase().endsWith(pattern.toLowerCase());
  },

  matches(text: string, regex: string): boolean {
    try {
      return new RegExp(regex, 'i').test(text);
    } catch {
      return false;
    }
  },

  // Array utilities
  hasAny(array: string[], values: string[]): boolean {
    return values.some(value => array.includes(value));
  },

  hasAll(array: string[], values: string[]): boolean {
    return values.every(value => array.includes(value));
  }
};

export class WorkflowExecutor {
  private hooks: WorkflowHook[] = [];
  private readonly STORAGE_KEY = 'fmail_workflows';

  constructor() {
    this.loadHooks();
  }

  // Load hooks from localStorage
  private loadHooks(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.hooks = parsed.map((hook: any) => ({
          ...hook,
          created_at: new Date(hook.created_at),
          last_executed: hook.last_executed ? new Date(hook.last_executed) : undefined
        }));
      }
    } catch (error) {
      console.error('Error loading workflows from storage:', error);
      this.hooks = [];
    }
  }

  // Save hooks to localStorage
  private saveHooks(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.hooks));
    } catch (error) {
      console.error('Error saving workflows to storage:', error);
    }
  }

  // Add a new workflow hook
  addHook(hook: Omit<WorkflowHook, 'id' | 'created_at' | 'execution_count'>): string {
    const newHook: WorkflowHook = {
      ...hook,
      id: crypto.randomUUID(),
      created_at: new Date(),
      execution_count: 0
    };
    
    this.hooks.push(newHook);
    this.saveHooks();
    return newHook.id;
  }

  // Get all hooks
  getHooks(): WorkflowHook[] {
    return [...this.hooks];
  }

  // Get enabled hooks for a specific trigger
  getHooksForTrigger(trigger: string): WorkflowHook[] {
    return this.hooks.filter(hook => 
      hook.enabled && hook.trigger_event === trigger
    );
  }

  // Enable/disable a hook
  toggleHook(hookId: string, enabled: boolean): boolean {
    const hook = this.hooks.find(h => h.id === hookId);
    if (hook) {
      hook.enabled = enabled;
      this.saveHooks();
      return true;
    }
    return false;
  }

  // Delete a hook
  deleteHook(hookId: string): boolean {
    const index = this.hooks.findIndex(h => h.id === hookId);
    if (index >= 0) {
      this.hooks.splice(index, 1);
      this.saveHooks();
      return true;
    }
    return false;
  }

  // Execute workflows for an incoming email
  async executeEmailWorkflows(email: Email, context: WorkflowContext): Promise<WorkflowResult[]> {
    const hooks = this.getHooksForTrigger('email_received');
    const results: WorkflowResult[] = [];

    for (const hook of hooks) {
      const result = await this.executeHook(hook, email, context);
      results.push(result);
      
      // Update execution stats if successful
      if (result.success) {
        hook.execution_count++;
        hook.last_executed = new Date();
      }
    }

    if (results.some(r => r.success)) {
      this.saveHooks();
    }

    return results;
  }

  // Execute workflows for user actions (for pattern detection)
  async executeActionWorkflows(action: UserAction, context: WorkflowContext): Promise<WorkflowResult[]> {
    const hooks = this.getHooksForTrigger('user_action');
    const results: WorkflowResult[] = [];

    // Convert UserAction to Email format using schema structure
    const email: Email = {
      id: parseInt(action.email.id) || 0,
      from: action.email.sender,
      email: action.email.sender, // Use sender as email address
      subject: action.email.subject,
      preview: '', // We don't have preview in UserAction
      time: new Date().toISOString(),
      unread: true, // Default assumption
      starred: false,
      hasAttachment: false,
      location: 'inbox' as const,
      tags: action.email.labels.map(label => label as any) || []
    };

    for (const hook of hooks) {
      const result = await this.executeHook(hook, email, context);
      results.push(result);
      
      if (result.success) {
        hook.execution_count++;
        hook.last_executed = new Date();
      }
    }

    if (results.some(r => r.success)) {
      this.saveHooks();
    }

    return results;
  }

  // Execute workflows when an email is closed
  async executeEmailCloseWorkflows(email: Email, context: WorkflowContext): Promise<WorkflowResult[]> {
    const hooks = this.getHooksForTrigger('email_closed');
    const results: WorkflowResult[] = [];

    for (const hook of hooks) {
      const result = await this.executeHook(hook, email, context);
      results.push(result);
      
      if (result.success) {
        hook.execution_count++;
        hook.last_executed = new Date();
      }
    }

    if (results.some(r => r.success)) {
      this.saveHooks();
    }

    return results;
  }

  // Execute a single workflow hook
  private async executeHook(hook: WorkflowHook, email: Email, context: WorkflowContext): Promise<WorkflowResult> {
    const startTime = performance.now();
    
    try {
      // Create API objects
      const emailAPI = new WorkflowEmailAPI(email);
      const contextAPI = new WorkflowContextAPI(context);

      // Set up global context for eval
      const originalEmail = (globalThis as any).email;
      const originalContext = (globalThis as any).context;
      const originalUtils = (globalThis as any).utils;
      const originalConsole = (globalThis as any).console;

      // Store reference to original console.log to avoid circular reference
      const originalConsoleLog = console.log;

      // Inject workflow APIs into global scope
      (globalThis as any).email = emailAPI;
      (globalThis as any).context = contextAPI;
      (globalThis as any).utils = workflowUtils;
      (globalThis as any).console = {
        log: (...args: any[]) => originalConsoleLog(`[Workflow ${hook.id}]`, ...args)
      };

      try {
        // Debug: Log the code being executed
        console.log(`[DEBUG] Executing workflow ${hook.id} with code:`);
        console.log('================== CODE START ==================');
        console.log(hook.function_code);
        console.log('================== CODE END ====================');
        
        // Execute the workflow function code using eval
        try {
          eval(hook.function_code);
        } catch (evalError) {
          console.error(`[DEBUG] Eval error in workflow ${hook.id}:`, evalError);
          console.error(`[DEBUG] Error type:`, evalError.constructor.name);
          console.error(`[DEBUG] Error message:`, evalError.message);
          if (evalError instanceof SyntaxError) {
            console.error(`[DEBUG] Syntax error details - this usually means invalid JavaScript code`);
          }
          throw evalError;
        }
      } finally {
        // Restore original global values
        if (originalEmail !== undefined) {
          (globalThis as any).email = originalEmail;
        } else {
          delete (globalThis as any).email;
        }
        if (originalContext !== undefined) {
          (globalThis as any).context = originalContext;
        } else {
          delete (globalThis as any).context;
        }
        if (originalUtils !== undefined) {
          (globalThis as any).utils = originalUtils;
        } else {
          delete (globalThis as any).utils;
        }
        if (originalConsole !== undefined) {
          (globalThis as any).console = originalConsole;
        } else {
          delete (globalThis as any).console;
        }
      }

      const executionTime = performance.now() - startTime;
      const actionsTaken = emailAPI.getActionsTaken();

      return {
        hook_id: hook.id,
        success: true,
        actions_taken: actionsTaken,
        email_id: email.id.toString(),
        execution_time: executionTime
      };

    } catch (error) {
      const executionTime = performance.now() - startTime;
      console.error(`Error executing workflow ${hook.id}:`, error);
      
      return {
        hook_id: hook.id,
        success: false,
        actions_taken: [],
        error: error instanceof Error ? error.message : String(error),
        execution_time: executionTime
      };
    }
  }

  // Check if action should trigger pattern analysis (simplified version)
  shouldAnalyzeForPatterns(action: UserAction): boolean {
    // Define intentional user actions that indicate deliberate email management
    const intentionalActions = new Set([
      'star', 'unstar', 'delete', 'archive', 'add_label', 
      'remove_label', 'mark_read', 'mark_unread', 'move_to_spam', 'move_to_trash'
    ]);

    return intentionalActions.has(action.action);
  }

  // Get current workflows for sending to backend
  getCurrentWorkflows(): Array<{id: string, description: string, trigger: string}> {
    return this.hooks.map(hook => ({
      id: hook.id,
      description: hook.description,
      trigger: hook.trigger_event
    }));
  }
}

// Export singleton instance
export const workflowExecutor = new WorkflowExecutor();
