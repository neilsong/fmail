import { EmailDetail } from "@/components/email/EmailDetail";
import { ComposeModal } from "@/components/email/ComposeModal";
import { useEmailStore } from "@/store/useEmailStore";

export const EmailDetailView = () => {
  const { selectedEmail, goBack, composeModalOpen, closeComposeModal } = useEmailStore();

  if (!selectedEmail) {
    return null;
  }

  return (
    <>
      <EmailDetail email={selectedEmail} onBack={goBack} />
      <ComposeModal isOpen={composeModalOpen} onClose={closeComposeModal} />
    </>
  );
};
