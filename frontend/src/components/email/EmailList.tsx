import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { EmailListItem, type Email } from "./EmailListItem";

interface EmailListProps {
  emails: Email[];
  onEmailSelect: (emailId: number) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const EmailList = ({ emails, onEmailSelect, searchQuery, onSearchChange }: EmailListProps) => {
  return (
    <div className="flex h-full flex-col overflow-auto bg-background md:border-r">
      <div className="flex h-14 shrink-0 items-center justify-between border-b px-3">
        <div className="ml-10 flex gap-1 lg:ml-0">
          <h2 className="font-semibold">Inbox</h2>
          <span className="text-xs font-normal text-muted-foreground">({emails.length})</span>
        </div>
        <Input 
          placeholder="Search emails..." 
          leadingIcon={<Search className="size-4" />}
          inputContainerClassName="w-2/3 max-w-md"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="h-full space-y-2 overflow-y-auto p-2">
        {emails.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              {searchQuery ? `No emails matching "${searchQuery}"` : "No emails in inbox"}
            </p>
          </div>
        ) : (
          emails.map((email) => (
            <EmailListItem
              key={email.id}
              email={email}
              onClick={() => onEmailSelect(email.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};
