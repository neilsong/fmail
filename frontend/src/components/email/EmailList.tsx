import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { EmailListItem, type Email } from "./EmailListItem";

interface EmailListProps {
  emails: Email[];
  onEmailSelect: (emailId: number) => void;
}

export const EmailList = ({ emails, onEmailSelect }: EmailListProps) => {
  return (
    <div className="flex h-full flex-col overflow-auto bg-background md:border-r">
      <div className="flex h-14 shrink-0 items-center justify-between border-b px-3">
        <div className="ml-10 flex gap-1 lg:ml-0">
          <h2 className="font-semibold">Inbox</h2>
          <span className="text-xs font-normal text-muted-foreground">(12)</span>
        </div>
        <div className="relative w-2/3 max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search emails..." className="pl-10 pr-3" />
        </div>
      </div>

      <div className="h-full space-y-2 overflow-y-auto p-2">
        {emails.map((email) => (
          <EmailListItem
            key={email.id}
            email={email}
            onClick={() => onEmailSelect(email.id)}
          />
        ))}
      </div>
    </div>
  );
};
