import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import type { Email } from "@/store/email.schema";
import { EmailLocation, EmailTag } from "@/store/email.schema";
import { useEmailStore } from "@/store/useEmailStore";
import {
  ArchiveX,
  ArrowLeftIcon,
  Clock,
  Forward,
  MoreHorizontal,
  Reply,
  StarIcon,
  Trash2,
} from "lucide-react";

interface EmailDetailProps {
  email: Email;
  onBack: () => void;
}

export const EmailDetail = ({ email, onBack }: EmailDetailProps) => {
  const toast = useToast();
  const { moveEmail, toggleTag, markAsRead, deleteEmail } = useEmailStore();

  const handleArchive = () => {
    const previousLocation = email.location;
    moveEmail(email.id, EmailLocation.archive);
    const toastId = toast.add({
      title: "Email archived",
      description: "Email has been moved to archive",
      actionProps: {
        children: "Undo",
        onClick: () => {
          moveEmail(email.id, previousLocation);
          toast.close(toastId);
        },
      },
    });
  };

  const handleDelete = () => {
    const previousLocation = email.location;
    deleteEmail(email.id);
    const toastId = toast.add({
      title: "Email moved to trash",
      description: "Email has been moved to trash",
      actionProps: {
        children: "Undo",
        onClick: () => {
          moveEmail(email.id, previousLocation);
          toast.close(toastId);
        },
      },
    });
  };

  const handleStar = () => {
    const isStarred = email.tags.includes(EmailTag.starred);
    toggleTag(email.id, EmailTag.starred);
    const toastId = toast.add({
      title: isStarred ? "Star removed" : "Email starred",
      description: isStarred
        ? "Star has been removed from email"
        : "Email has been starred",
      actionProps: {
        children: "Undo",
        onClick: () => {
          toggleTag(email.id, EmailTag.starred);
          toast.close(toastId);
        },
      },
    });
  };

  const handleMarkAsRead = (read: boolean) => {
    markAsRead(email.id, read);
    const toastId = toast.add({
      title: read ? "Marked as read" : "Marked as unread",
      description: read ? "Email marked as read" : "Email marked as unread",
      actionProps: {
        children: "Undo",
        onClick: () => {
          markAsRead(email.id, !read);
          toast.close(toastId);
        },
      },
    });
  };

  const handleMoveToLocation = (location: EmailLocation) => {
    const previousLocation = email.location;
    moveEmail(email.id, location);
    const locationNames = {
      [EmailLocation.inbox]: "inbox",
      [EmailLocation.spam]: "spam",
      [EmailLocation.trash]: "trash",
      [EmailLocation.archive]: "archive",
      [EmailLocation.sent]: "sent",
      [EmailLocation.snoozed]: "snoozed",
    };
    const toastId = toast.add({
      title: `Moved to ${locationNames[location]}`,
      description: `Email has been moved to ${locationNames[location]}`,
      actionProps: {
        children: "Undo",
        onClick: () => {
          moveEmail(email.id, previousLocation);
          toast.close(toastId);
        },
      },
    });
  };

  const handleToggleTag = (tag: EmailTag) => {
    const hasTag = email.tags.includes(tag);
    toggleTag(email.id, tag);
    const tagNames = {
      [EmailTag.important]: "Important",
      [EmailTag.work]: "Work",
      [EmailTag.personal]: "Personal",
      [EmailTag.todo]: "To-do",
      [EmailTag.social]: "Social",
      [EmailTag.updates]: "Updates",
      [EmailTag.forums]: "Forums",
      [EmailTag.promotions]: "Promotions",
      [EmailTag.starred]: "Starred",
    };
    const toastId = toast.add({
      title: hasTag ? `Removed "${tagNames[tag]}" tag` : `Added "${tagNames[tag]}" tag`,
      description: hasTag
        ? `"${tagNames[tag]}" tag has been removed`
        : `"${tagNames[tag]}" tag has been added`,
      actionProps: {
        children: "Undo",
        onClick: () => {
          toggleTag(email.id, tag);
          toast.close(toastId);
        },
      },
    });
  };

  const isStarred = email.tags.includes(EmailTag.starred);

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="h-14">
        <div>
          <div className="flex h-14 items-center gap-2 border-b px-3">
            <Tooltip>
              <TooltipTrigger>
                <Button variant="ghost" size="icon" onClick={onBack}>
                  <ArrowLeftIcon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Back to inbox</TooltipContent>
            </Tooltip>
            <Separator orientation="vertical" className="mx-1 h-4" />
            <Tooltip>
              <TooltipTrigger>
                <Button variant="ghost" size="icon" onClick={handleArchive}>
                  <ArchiveX className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Archive</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <Button variant="ghost" size="icon" onClick={handleDelete}>
                  <Trash2 className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
            <Separator orientation="vertical" className="mx-1 h-4" />
            <Tooltip>
              <TooltipTrigger>
                <Button variant="ghost" size="icon">
                  <Reply className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reply</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <Button variant="ghost" size="icon">
                  <Forward className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Forward</TooltipContent>
            </Tooltip>
            <Separator orientation="vertical" className="mx-1 h-4" />
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Tooltip>
                  <TooltipTrigger>
                    <Button size="icon" variant="ghost">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>More actions</TooltipContent>
                </Tooltip>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  {email.unread ? (
                    <DropdownMenuItem onClick={() => handleMarkAsRead(true)}>
                      Mark as Read
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => handleMarkAsRead(false)}>
                      Mark as Unread
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleStar}>
                    <StarIcon className="size-4 mr-2" />
                    {isStarred ? "Unstar" : "Star"}
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Clock className="size-4 mr-2" />
                    Snooze
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Move to</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => handleMoveToLocation(EmailLocation.archive)}
                  >
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleMoveToLocation(EmailLocation.spam)}
                  >
                    Spam
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleMoveToLocation(EmailLocation.trash)}
                  >
                    Trash
                    <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Categories</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleToggleTag(EmailTag.social)}>
                    Social
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleToggleTag(EmailTag.updates)}>
                    Updates
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleToggleTag(EmailTag.forums)}>
                    Forums
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleToggleTag(EmailTag.promotions)}>
                    Promotions
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Labels</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuCheckboxItem
                      checked={email.tags.includes(EmailTag.important)}
                      onClick={() => handleToggleTag(EmailTag.important)}
                    >
                      Important
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={email.tags.includes(EmailTag.work)}
                      onClick={() => handleToggleTag(EmailTag.work)}
                    >
                      Work
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={email.tags.includes(EmailTag.personal)}
                      onClick={() => handleToggleTag(EmailTag.personal)}
                    >
                      Personal
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={email.tags.includes(EmailTag.todo)}
                      onClick={() => handleToggleTag(EmailTag.todo)}
                    >
                      To-do
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex items-center gap-x-2 border-b px-3 py-4">
        <Avatar>
          <AvatarFallback>{email.from[0]}</AvatarFallback>
        </Avatar>
        <div className="flex flex-1 flex-col space-y-0.5">
          <h3 className="text-sm font-medium">{email.subject}</h3>
          <p className="text-xs text-muted-foreground">
            From: {email.from} &lt;{email.email}&gt;
          </p>
          <p className="text-xs text-muted-foreground">{email.time}</p>
        </div>
      </div>

      <ScrollArea className="overscoll-auto grow">
        <div className="whitespace-pre-wrap p-4 text-sm leading-relaxed">
          {email.preview}
        </div>
      </ScrollArea>

      <footer className="flex flex-col border-t bg-background p-4">
        <Textarea placeholder="Type your message..." className="min-h-20 resize-none" />
        <Button className="mt-2 w-fit self-end" variant="ghost">
          Send
        </Button>
      </footer>
    </div>
  );
};
