import { EmailList } from "@/components/email/EmailList";
import { EmailSidebar } from "@/components/email/EmailSidebar";
import { emails } from "@/data/emails";
import { useEmailStore } from "@/store/useEmailStore";
import { useMemo, useState } from "react";

export const EmailHomeView = () => {
  const { sidebarOpen, setSelectedEmail, toggleSidebar } = useEmailStore();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEmails = useMemo(() => {
    if (!searchQuery.trim()) {
      return emails;
    }

    const query = searchQuery.toLowerCase();
    return emails.filter((email) => {
      return (
        email.from.toLowerCase().includes(query) ||
        email.subject.toLowerCase().includes(query) ||
        email.preview.toLowerCase().includes(query) ||
        email.email.toLowerCase().includes(query)
      );
    });
  }, [searchQuery]);

  const handleEmailSelect = (emailId: number) => {
    const email = emails.find((e) => e.id === emailId);
    if (email) {
      setSelectedEmail(email);
    }
  };

  return (
    <div className="relative grid h-screen overflow-hidden md:grid-cols-[400px_1fr] lg:grid-cols-[240px_1fr]">
      <EmailSidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

      <EmailList 
        emails={filteredEmails} 
        onEmailSelect={handleEmailSelect}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
    </div>
  );
};
