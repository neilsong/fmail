import { EmailDetail } from "@/components/email/EmailDetail";
import { useEmailStore } from "@/store/useEmailStore";

export const EmailDetailView = () => {
  const { selectedEmail, goBack } = useEmailStore();

  if (!selectedEmail) {
    return null;
  }

  return <EmailDetail email={selectedEmail} onBack={goBack} />;
};
