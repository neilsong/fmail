import { ComposeModal } from "@/components/email/ComposeModal";
import { EmailList } from "@/components/email/EmailList";
import { EmailSidebar } from "@/components/email/EmailSidebar";
import { useEmailStore } from "@/store/useEmailStore";

export const EmailHomeView = () => {
  const {
    sidebarOpen,
    setSelectedEmail,
    toggleSidebar,
    emails,
    composeModalOpen,
    closeComposeModal,
  } = useEmailStore();

  const handleEmailSelect = (emailId: number) => {
    const email = emails.find((e) => e.id === emailId);
    if (email) {
      setSelectedEmail(email);
    }
  };

  return (
    <div className="relative h-screen lg:pl-[240px]">
      <EmailSidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      <EmailList onEmailSelect={handleEmailSelect} />
      <ComposeModal isOpen={composeModalOpen} onClose={closeComposeModal} />
    </div>
  );
};
