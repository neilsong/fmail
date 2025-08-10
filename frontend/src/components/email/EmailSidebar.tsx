import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Archive,
  Clock,
  Inbox,
  MessageSquareXIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  Pencil,
  Send,
  Star,
  Trash2,
} from "lucide-react";
import { useEmailStore } from "@/store/useEmailStore";
import { EmailLocation, EmailTag } from "@/store/email.schema";

interface EmailSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const EmailSidebar = ({ isOpen, onToggle }: EmailSidebarProps) => {
  const { 
    currentLocation, 
    currentTag,
    setCurrentLocation, 
    setCurrentTag,
    getLocationCount,
    getTagCount,
    emails
  } = useEmailStore();

  const inboxCount = getLocationCount(EmailLocation.inbox);
  const spamCount = getLocationCount(EmailLocation.spam);
  const trashCount = getLocationCount(EmailLocation.trash);
  const sentCount = getLocationCount(EmailLocation.sent);
  const archiveCount = getLocationCount(EmailLocation.archive);
  const snoozedCount = getLocationCount(EmailLocation.snoozed);
  const starredCount = getTagCount(EmailTag.starred);

  const unreadInboxCount = emails.filter(
    e => e.location === EmailLocation.inbox && e.unread
  ).length;

  const handleLocationClick = (location: EmailLocation | "all") => {
    setCurrentLocation(location);
  };

  const handleStarredClick = () => {
    setCurrentLocation("all");
    setCurrentTag(EmailTag.starred);
  };

  return (
    <>
      <div
        className={cn(
          "absolute inset-y-0 left-0 z-20 w-[240px] bg-background p-4 transition-transform lg:static lg:translate-x-0 lg:border-r",
          isOpen ? "translate-x-0 border-r" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col gap-2">
          <Button className="gap-2">
            <Pencil className="size-4" />
            Compose
          </Button>
          <nav className="flex flex-col gap-1 [&>button]:font-normal">
            <Button 
              variant="ghost" 
              className={cn(
                "justify-between gap-2",
                currentLocation === EmailLocation.inbox && !currentTag && "bg-muted"
              )}
              onClick={() => handleLocationClick(EmailLocation.inbox)}
            >
              <div className="flex items-center gap-2">
                <Inbox className="size-4" />
                Inbox
              </div>
              <div className="flex items-center gap-1">
                {unreadInboxCount > 0 && (
                  <span className="text-xs font-semibold">{unreadInboxCount}</span>
                )}
                <span className="text-xs font-normal text-muted-foreground">
                  {inboxCount}
                </span>
              </div>
            </Button>
            <Button 
              variant="ghost" 
              className={cn(
                "justify-between gap-2",
                currentTag === EmailTag.starred && "bg-muted"
              )}
              onClick={handleStarredClick}
            >
              <div className="flex items-center gap-2">
                <Star className="size-4" />
                Starred
              </div>
              {starredCount > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  {starredCount}
                </span>
              )}
            </Button>
            <Button 
              variant="ghost" 
              className={cn(
                "justify-between gap-2",
                currentLocation === EmailLocation.sent && !currentTag && "bg-muted"
              )}
              onClick={() => handleLocationClick(EmailLocation.sent)}
            >
              <div className="flex items-center gap-2">
                <Send className="size-4" />
                Sent
              </div>
              {sentCount > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  {sentCount}
                </span>
              )}
            </Button>
            <Button 
              variant="ghost" 
              className={cn(
                "justify-between gap-2",
                currentLocation === EmailLocation.archive && !currentTag && "bg-muted"
              )}
              onClick={() => handleLocationClick(EmailLocation.archive)}
            >
              <div className="flex items-center gap-2">
                <Archive className="size-4" />
                Archive
              </div>
              {archiveCount > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  {archiveCount}
                </span>
              )}
            </Button>
            <Button 
              variant="ghost" 
              className={cn(
                "justify-between gap-2",
                currentLocation === EmailLocation.snoozed && !currentTag && "bg-muted"
              )}
              onClick={() => handleLocationClick(EmailLocation.snoozed)}
            >
              <div className="flex items-center gap-2">
                <Clock className="size-4" />
                Snoozed
              </div>
              {snoozedCount > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  {snoozedCount}
                </span>
              )}
            </Button>
            <Button 
              variant="ghost" 
              className={cn(
                "justify-between gap-2",
                currentLocation === EmailLocation.spam && !currentTag && "bg-muted"
              )}
              onClick={() => handleLocationClick(EmailLocation.spam)}
            >
              <div className="flex items-center gap-2">
                <MessageSquareXIcon className="size-4" />
                Spam
              </div>
              {spamCount > 0 && (
                <span className="text-xs font-normal text-muted-foreground text-destructive">
                  {spamCount}
                </span>
              )}
            </Button>
            <Button 
              variant="ghost" 
              className={cn(
                "justify-between gap-2",
                currentLocation === EmailLocation.trash && !currentTag && "bg-muted"
              )}
              onClick={() => handleLocationClick(EmailLocation.trash)}
            >
              <div className="flex items-center gap-2">
                <Trash2 className="size-4" />
                Trash
              </div>
              {trashCount > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  {trashCount}
                </span>
              )}
            </Button>
          </nav>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-11 top-2.5 z-50 lg:hidden"
          onClick={onToggle}
        >
          {isOpen ? <PanelRightOpenIcon /> : <PanelRightCloseIcon />}
        </Button>
      </div>

      {isOpen && (
        <div className="absolute inset-0 z-10 bg-black/90 lg:hidden" onClick={onToggle} />
      )}
    </>
  );
};