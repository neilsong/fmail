export interface UserAction {
  action:
    | "archive"
    | "delete"
    | "star"
    | "unstar"
    | "open"
    | "close"
    | "mark_read"
    | "mark_unread"
    | "add_label"
    | "remove_label"
    | "move_to_inbox"
    | "move_to_spam"
    | "move_to_trash"
    | "move_to_archive"
    | "undo_archive"
    | "undo_delete"
    | "undo_star"
    | "undo_unstar"
    | "undo_mark_read"
    | "undo_mark_unread"
    | "undo_add_label"
    | "undo_remove_label"
    | "undo_move_to_inbox"
    | "undo_move_to_spam"
    | "undo_move_to_trash"
    | "undo_move_to_archive";
  email: {
    id: string;
    sender: string;
    subject: string;
    labels: string[];
  };
  context: {
    location: "home" | "detail"; // Where the action was taken
  };
  duration?: number;
}

export interface WorkflowSuggestion {
  id: string;
  description: string;
  confidence: number;
  reasoning: string;
  generated_function: string;
  pattern_data: Record<string, any>;
  created_at: string;
}

export class WorkflowTracker {
  private ws: WebSocket | null = null;
  private userId: string;
  private sessionId: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private onSuggestionCallback?: (suggestion: WorkflowSuggestion) => void;
  private onConfirmationCallback?: (message: string) => void;

  constructor(userId: string) {
    this.userId = userId;
    this.sessionId = crypto.randomUUID();
    this.connect();
  }

  private connect() {
    try {
      this.ws = new WebSocket(`ws://localhost:8000/ws/${this.userId}/${this.sessionId}`);

      this.ws.onopen = () => {
        console.log("WorkflowTracker connected");
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      this.ws.onclose = () => {
        console.log("WorkflowTracker disconnected");
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    } catch (error) {
      console.error("Error connecting to WebSocket:", error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

      console.log(
        `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`
      );

      setTimeout(() => {
        this.connect();
      }, delay);
    }
  }

  private handleMessage(message: any) {
    switch (message.type) {
      case "workflow_suggestion":
        if (this.onSuggestionCallback) {
          this.onSuggestionCallback(message.data);
        }
        break;

      case "suggestion_accepted":
        if (this.onConfirmationCallback) {
          this.onConfirmationCallback(message.data.message);
        }
        break;

      default:
        console.log("Unknown message type:", message.type);
    }
  }

  trackAction(action: Omit<UserAction, "timestamp" | "user_id" | "session_id">) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const fullAction = {
        ...action,
        timestamp: new Date().toISOString(),
        user_id: this.userId,
        session_id: this.sessionId,
      };

      console.log("Tracking action:", fullAction);

      const message = {
        type: "user_action",
        data: fullAction,
      };

      this.ws.send(JSON.stringify(message));
      console.log("Tracked action:", action.action, "on email from", action.email.sender);
    } else {
      console.warn("WebSocket not connected, cannot track action");
    }
  }

  respondToSuggestion(suggestionId: string, accepted: boolean) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        type: "suggestion_response",
        data: {
          suggestion_id: suggestionId,
          accepted: accepted,
        },
      };

      this.ws.send(JSON.stringify(message));
      console.log("Responded to suggestion:", suggestionId, "accepted:", accepted);
    }
  }

  onSuggestion(callback: (suggestion: WorkflowSuggestion) => void) {
    this.onSuggestionCallback = callback;
  }

  onConfirmation(callback: (message: string) => void) {
    this.onConfirmationCallback = callback;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
