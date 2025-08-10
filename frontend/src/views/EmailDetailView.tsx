import { ComposeModal } from "@/components/email/ComposeModal";
import { EmailDetail } from "@/components/email/EmailDetail";
import { EmailSidebar } from "@/components/email/EmailSidebar";
import { useEmailStore } from "@/store/useEmailStore";

export const EmailDetailView = () => {
  const {
    selectedEmail,
    goBack,
    composeModalOpen,
    closeComposeModal,
    sidebarOpen,
    toggleSidebar,
  } = useEmailStore();

  if (!selectedEmail) {
    return null;
  }

  return (
    <div className="relative h-screen lg:pl-[240px]">
      <EmailSidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      <EmailDetail email={selectedEmail} onBack={goBack} />
      <ComposeModal isOpen={composeModalOpen} onClose={closeComposeModal} />
    </div>
  );
};
