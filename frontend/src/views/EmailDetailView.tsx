import { EmailDetail } from "@/components/email/EmailDetail";
import { EmailSidebar } from "@/components/email/EmailSidebar";
import { useEmailStore } from "@/store/useEmailStore";

export const EmailDetailView = () => {
  const { selectedEmail, goBack, sidebarOpen, toggleSidebar } = useEmailStore();

  if (!selectedEmail) {
    return null;
  }

  return (
    <div className="relative grid h-screen overflow-hidden lg:grid-cols-[240px_1fr]">
      <EmailSidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      <EmailDetail email={selectedEmail} onBack={goBack} />
    </div>
  );
};
