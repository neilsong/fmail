import { EmailLocation, type Email, type EmailLocation as EmailLocationType } from "@/store/email.schema";
import { Paperclip } from "lucide-react";
import { useState } from "react";
import { EmailActions } from "./EmailActions";

interface EmailListItemProps {
  email: Email;
  currentLocation: EmailLocationType | "all";
  onClick: () => void;
}

export const EmailListItem = ({ email, currentLocation, onClick }: EmailListItemProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        onClick={onClick}
        className="w-full rounded-md border px-4 py-3 text-left transition-colors hover:bg-accent hover:border-primary active:bg-accent/80"
      >
        <div className="flex items-center gap-4">
          <div className="flex w-[180px] shrink-0 flex-col">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">
                {currentLocation === EmailLocation.sent && email.to 
                  ? email.to 
                  : email.from}
              </span>
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
            {email.hasAttachment && (
              <Paperclip className="size-3 text-muted-foreground" />
            )}
            <span className="text-xs text-muted-foreground">{email.time}</span>
          </div>
        </div>
      </button>

      {/* Floating Action Shortcuts */}
      <div
        className={`absolute bottom-2 right-2 z-10 rounded-lg border bg-background/95 backdrop-blur-sm shadow-lg p-2 transition-all duration-200 ease-out ${
          isHovered
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-2 pointer-events-none"
        }`}
      >
        <EmailActions
          email={email}
          variant="compact"
          onActionComplete={() => setIsHovered(false)}
        />
      </div>
    </div>
  );
};
