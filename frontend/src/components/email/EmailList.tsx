import { Input } from "@/components/ui/input";
import { EmailLocation, EmailTag } from "@/store/email.schema";
import { useEmailStore } from "@/store/useEmailStore";
import { Search } from "lucide-react";
import { EmailListItem } from "./EmailListItem";

interface EmailListProps {
  onEmailSelect: (emailId: number) => void;
}

export const EmailList = ({ onEmailSelect }: EmailListProps) => {
  const { getFilteredEmails, currentLocation, currentTag, showStarred, searchQuery, setSearchQuery } =
    useEmailStore();

  const filteredEmails = getFilteredEmails();

  const getViewTitle = () => {
    if (showStarred) {
      return "Starred";
    }
    
    if (currentTag) {
      const tagTitles = {
        [EmailTag.important]: "Important",
        [EmailTag.work]: "Work",
        [EmailTag.personal]: "Personal",
        [EmailTag.todo]: "To-do",
        [EmailTag.social]: "Social",
        [EmailTag.updates]: "Updates",
        [EmailTag.forums]: "Forums",
        [EmailTag.promotions]: "Promotions",
      };
      return tagTitles[currentTag] || "Filtered";
    }

    const locationTitles = {
      [EmailLocation.inbox]: "Inbox",
      [EmailLocation.sent]: "Sent",
      [EmailLocation.archive]: "Archive",
      [EmailLocation.spam]: "Spam",
      [EmailLocation.trash]: "Trash",
      [EmailLocation.snoozed]: "Snoozed",
      "all": "All Mail",
    };

    return locationTitles[currentLocation] || "Inbox";
  };

  const getEmptyMessage = () => {
    if (searchQuery) {
      return `No emails matching "${searchQuery}"`;
    }

    if (showStarred) {
      return "No starred emails";
    }

    if (currentTag) {
      const tagMessages = {
        [EmailTag.important]: "No important emails",
        [EmailTag.work]: "No work emails",
        [EmailTag.personal]: "No personal emails",
        [EmailTag.todo]: "No to-do emails",
        [EmailTag.social]: "No social emails",
        [EmailTag.updates]: "No update emails",
        [EmailTag.forums]: "No forum emails",
        [EmailTag.promotions]: "No promotional emails",
      };
      return tagMessages[currentTag] || "No emails with this label";
    }

    const locationMessages = {
      [EmailLocation.inbox]: "No emails in inbox",
      [EmailLocation.sent]: "No sent emails",
      [EmailLocation.archive]: "No archived emails",
      [EmailLocation.spam]: "No spam emails",
      [EmailLocation.trash]: "Trash is empty",
      [EmailLocation.snoozed]: "No snoozed emails",
      "all": "No emails",
    };

    return locationMessages[currentLocation] || "No emails";
  };

  return (
    <div className="flex h-full flex-col bg-background md:border-r">
      <div className="flex h-14 shrink-0 items-center justify-between border-b px-3">
        <div className="ml-10 flex gap-1 lg:ml-0">
          <h2 className="font-semibold">{getViewTitle()}</h2>
          <span className="text-xs font-normal text-muted-foreground">
            ({filteredEmails.length})
          </span>
        </div>
        <Input
          placeholder="Search emails..."
          leadingIcon={<Search className="size-4" />}
          inputContainerClassName="w-2/3 max-w-md"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {filteredEmails.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">{getEmptyMessage()}</p>
          </div>
        ) : (
          filteredEmails.map((email) => (
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
