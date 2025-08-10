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

interface EmailSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const EmailSidebar = ({ isOpen, onToggle }: EmailSidebarProps) => {
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
            <Button variant="ghost" className="justify-between gap-2 bg-muted">
              <div className="flex items-center gap-2">
                <Inbox className="size-4" />
                Inbox
              </div>
              <span className="text-xs font-normal text-muted-foreground">125</span>
            </Button>
            <Button variant="ghost" className="justify-start gap-2">
              <Star className="size-4" />
              Starred
            </Button>
            <Button variant="ghost" className="justify-start gap-2">
              <Send className="size-4" />
              Sent
            </Button>
            <Button variant="ghost" className="justify-start gap-2">
              <Archive className="size-4" />
              Archive
            </Button>
            <Button variant="ghost" className="justify-start gap-2">
              <Clock className="size-4" />
              Snoozed
            </Button>
            <Button variant="ghost" className="justify-between gap-2">
              <div className="flex items-center gap-2">
                <MessageSquareXIcon className="size-4" />
                Spam
              </div>
              <span className="text-xs font-normal text-muted-foreground">12</span>
            </Button>
            <Button variant="ghost" className="justify-start gap-2">
              <Trash2 className="size-4" />
              Trash
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
