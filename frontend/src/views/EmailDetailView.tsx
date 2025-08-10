import { EmailDetail } from "@/components/email/EmailDetail";
import { EmailSidebar } from "@/components/email/EmailSidebar";
import { ComposeModal } from "@/components/email/ComposeModal";
import { useEmailStore } from "@/store/useEmailStore";

export const EmailDetailView = () => {
  const { selectedEmail, goBack, composeModalOpen, closeComposeModal, sidebarOpen, toggleSidebar } = useEmailStore();

  if (!selectedEmail) {
    return null;
  }

  return (
    <>
      <div className="relative grid h-screen overflow-hidden lg:grid-cols-[240px_1fr]">
        <EmailSidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
        <EmailDetail email={selectedEmail} onBack={goBack} />
      </div>
      <ComposeModal isOpen={composeModalOpen} onClose={closeComposeModal} />
    </>
  );
};
