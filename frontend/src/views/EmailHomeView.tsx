import { EmailList } from "@/components/email/EmailList";
import { EmailSidebar } from "@/components/email/EmailSidebar";
import { useEmailStore } from "@/store/useEmailStore";

export const EmailHomeView = () => {
  const { sidebarOpen, setSelectedEmail, toggleSidebar, emails } = useEmailStore();

  const handleEmailSelect = (emailId: number) => {
    const email = emails.find((e) => e.id === emailId);
    if (email) {
      setSelectedEmail(email);
    }
  };

  return (
    <div className="relative grid h-screen overflow-hidden md:grid-cols-[400px_1fr] lg:grid-cols-[240px_1fr]">
      <EmailSidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      <EmailList onEmailSelect={handleEmailSelect} />
    </div>
  );
};
