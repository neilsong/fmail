import { useEffect } from "react";
import { useEmailStore } from "@/store/useEmailStore";
import { EmailDetailView } from "@/views/EmailDetailView";
import { EmailHomeView } from "@/views/EmailHomeView";
import { workflowService } from "@/services/WorkflowService";
import { suggestionUIHandler } from "@/services/SuggestionUIHandler";
import { emailSimulator } from "@/services/EmailSimulator";
import { useToast } from "@/hooks/use-toast";

function App() {
  const { currentView } = useEmailStore();
  const toast = useToast();

  useEffect(() => {
    // Initialize global services once at app level
    console.log("🚀 App: Initializing global services...");
    
    const initializeServices = async () => {
      try {
        // Initialize workflow service
        workflowService.initialize("user123");
        
        // Initialize suggestion UI handler with toast manager
        suggestionUIHandler.initialize(toast);
        
        // Initialize and start email simulator
        await emailSimulator.initialize();
        emailSimulator.startSimulation();
        
        console.log("✅ App: All global services initialized and email simulation started");
      } catch (error) {
        console.error("❌ App: Failed to initialize services:", error);
      }
    };

    initializeServices();
  }, [toast]);

  return currentView === "home" ? <EmailHomeView /> : <EmailDetailView />;
}

export default App;
