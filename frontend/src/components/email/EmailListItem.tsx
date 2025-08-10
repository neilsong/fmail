import { Paperclip } from "lucide-react";

export interface Email {
  id: number;
  from: string;
  email: string;
  subject: string;
  preview: string;
  time: string;
  unread: boolean;
  hasAttachment: boolean;
}

interface EmailListItemProps {
  email: Email;
  onClick: () => void;
}

export const EmailListItem = ({ email, onClick }: EmailListItemProps) => {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-md border px-4 py-3 text-left transition-colors hover:bg-accent hover:border-primary active:bg-accent/80"
    >
      <div className="flex items-center gap-4">
        <div className="flex w-[180px] shrink-0 flex-col">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{email.from}</span>
            {email.unread && (
              <span className="size-1.5 shrink-0 rounded-full bg-emerald-400" />
            )}
          </div>
          <p className="truncate text-xs font-medium text-muted-foreground">
            {email.subject}
          </p>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-center px-4">
          <p className="line-clamp-2 text-xs text-muted-foreground">{email.preview}</p>
        </div>

        <div className="flex w-[100px] shrink-0 items-center justify-end gap-2">
          {email.hasAttachment && <Paperclip className="size-3 text-muted-foreground" />}
          <span className="text-xs text-muted-foreground">{email.time}</span>
        </div>
      </div>
    </button>
  );
};
