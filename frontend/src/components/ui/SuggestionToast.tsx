import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { WorkflowSuggestion } from "@/WorkflowTracker";
import { CheckIcon, XIcon, Sparkles } from "lucide-react";

/**
 * Creates a workflow suggestion toast using the app's toast system
 * This provides better UX consistency and automatic queueing/positioning
 */
export const useWorkflowSuggestion = () => {
  const toast = useToast();
  
  const showSuggestion = (
    suggestion: WorkflowSuggestion,
    onAccept: () => void,
    onReject: () => void
  ) => {
    const toastId = toast.add({
      title: `Workflow Suggestion (${Math.round(suggestion.confidence * 100)}% confidence)`,
      description: suggestion.description,
      actionProps: {
        children: "Accept",
        onClick: () => {
          onAccept();
          toast.close(toastId);
        },
      },
      // Add custom content for the suggestion
      content: (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-blue-600">
            <Sparkles className="h-4 w-4" />
            <span className="font-medium">Workflow Suggestion</span>
          </div>
          <p className="text-sm">{suggestion.description}</p>
          <p className="text-xs text-muted-foreground">{suggestion.reasoning}</p>
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              onClick={() => {
                onAccept();
                toast.close(toastId);
              }}
              className="flex-1"
            >
              <CheckIcon className="h-3 w-3 mr-1" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onReject();
                toast.close(toastId);
              }}
              className="flex-1"
            >
              <XIcon className="h-3 w-3 mr-1" />
              Reject
            </Button>
          </div>
        </div>
      ),
      duration: 0, // Don't auto-dismiss - user needs to interact
    });
    
    return toastId;
  };
  
  return { showSuggestion };
};

// Simple function-based approach for easier integration
export const showWorkflowSuggestion = (
  suggestion: WorkflowSuggestion,
  onAccept: () => void,
  onReject: () => void
) => {
  // For now, we'll use a simple approach that works with the existing toast system
  // This can be enhanced later to fully integrate with the toast manager
  console.log("Workflow suggestion:", suggestion.description);
  
  // Create a simple notification-style approach
  if (window.confirm(`${suggestion.description}\n\nReasoning: ${suggestion.reasoning}\n\nAccept this automation?`)) {
    onAccept();
  } else {
    onReject();
  }
};
