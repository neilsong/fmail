import { useEmailStore } from "@/store/useEmailStore";
import { EmailDetailView } from "@/views/EmailDetailView";
import { EmailHomeView } from "@/views/EmailHomeView";

function App() {
  const { currentView } = useEmailStore();

  return currentView === "home" ? <EmailHomeView /> : <EmailDetailView />;
}

export default App;
