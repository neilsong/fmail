import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { workflowService, type UserAction } from "@/services/WorkflowService";
import type { Email } from "@/store/email.schema";
import { EmailLocation, EmailTag } from "@/store/email.schema";
import { useEmailStore } from "@/store/useEmailStore";
import {
  ArchiveX,
  Clock,
  Forward,
  Inbox,
  MoreHorizontal,
  Reply,
  StarIcon,
  Trash2,
} from "lucide-react";
import { useEffect } from "react";

interface EmailActionsProps {
  email: Email;
  variant?: "full" | "compact";
  context?: "home" | "detail"; // Track where the action is taken
  onActionComplete?: () => void;
}

export const EmailActions = ({
  email,
  variant = "full",
  context = "home",
  onActionComplete,
}: EmailActionsProps) => {
  const toast = useToast();
  const { moveEmail, toggleTag, markAsRead, deleteEmail, toggleStarred } =
    useEmailStore();

  const trackAction = (action: UserAction["action"]) => {
    workflowService.trackAction({
      action,
      email: {
        id: String(email.id),
        sender: email.from,
        subject: email.subject,
        labels: (email.tags || []).map((tag) => String(tag)),
      },
      context: {
        location: context,
      },
    });
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    trackAction("archive");
    const previousLocation = email.location;
    moveEmail(email.id, EmailLocation.archive);
    const toastId = toast.add({
      title: "Email archived",
      description: "Email has been moved to archive",
      actionProps: {
        children: "Undo",
        onClick: () => {
          trackAction("undo_archive");
          moveEmail(email.id, previousLocation);
          toast.close(toastId);
        },
      },
    });
    onActionComplete?.();
  };

  const handleMoveToInbox = (e: React.MouseEvent) => {
    e.stopPropagation();
    trackAction("move_to_inbox");
    const previousLocation = email.location;
    moveEmail(email.id, EmailLocation.inbox);
    const toastId = toast.add({
      title: "Moved to inbox",
      description: "Email has been moved to inbox",
      actionProps: {
        children: "Undo",
        onClick: () => {
          trackAction("undo_move_to_inbox");
          moveEmail(email.id, previousLocation);
          toast.close(toastId);
        },
      },
    });
    onActionComplete?.();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    trackAction("delete");
    const previousLocation = email.location;
    deleteEmail(email.id);
    const toastId = toast.add({
      title: "Email moved to trash",
      description: "Email has been moved to trash",
      actionProps: {
        children: "Undo",
        onClick: () => {
          trackAction("undo_delete");
          moveEmail(email.id, previousLocation);
          toast.close(toastId);
        },
      },
    });
    onActionComplete?.();
  };

  const handleStar = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isStarred = email.starred;
    trackAction(isStarred ? "unstar" : "star");
    toggleStarred(email.id);
    const toastId = toast.add({
      title: isStarred ? "Star removed" : "Email starred",
      description: isStarred
        ? "Star has been removed from email"
        : "Email has been starred",
      actionProps: {
        children: "Undo",
        onClick: () => {
          trackAction(isStarred ? "undo_unstar" : "undo_star");
          toggleStarred(email.id);
          toast.close(toastId);
        },
      },
    });
    onActionComplete?.();
  };

  const handleMarkAsRead = (read: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    trackAction(read ? "mark_read" : "mark_unread");
    markAsRead(email.id, read);
    const toastId = toast.add({
      title: read ? "Marked as read" : "Marked as unread",
      description: read ? "Email marked as read" : "Email marked as unread",
      actionProps: {
        children: "Undo",
        onClick: () => {
          trackAction(read ? "undo_mark_read" : "undo_mark_unread");
          markAsRead(email.id, !read);
          toast.close(toastId);
        },
      },
    });
    onActionComplete?.();
  };

  const handleMoveToLocation = (location: EmailLocation, e: React.MouseEvent) => {
    e.stopPropagation();
    const locationNames = {
      [EmailLocation.inbox]: "inbox",
      [EmailLocation.spam]: "spam",
      [EmailLocation.trash]: "trash",
      [EmailLocation.archive]: "archive",
      [EmailLocation.sent]: "sent",
      [EmailLocation.snoozed]: "snoozed",
    };
    trackAction(`move_to_${locationNames[location]}` as UserAction["action"]);
    const previousLocation = email.location;
    moveEmail(email.id, location);
    const toastId = toast.add({
      title: `Moved to ${locationNames[location]}`,
      description: `Email has been moved to ${locationNames[location]}`,
      actionProps: {
        children: "Undo",
        onClick: () => {
          trackAction(`undo_move_to_${locationNames[location]}` as UserAction["action"]);
          moveEmail(email.id, previousLocation);
          toast.close(toastId);
        },
      },
    });
    onActionComplete?.();
  };

  const handleToggleTag = (tag: EmailTag, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const hasTag = email.tags.includes(tag);

    // Track label assignment/removal action
    trackAction(hasTag ? "remove_label" : "add_label");

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
    };
    const toastId = toast.add({
      title: hasTag ? `Removed "${tagNames[tag]}" tag` : `Added "${tagNames[tag]}" tag`,
      description: hasTag
        ? `"${tagNames[tag]}" tag has been removed`
        : `"${tagNames[tag]}" tag has been added`,
      actionProps: {
        children: "Undo",
        onClick: () => {
          // Track undo action for label changes
          trackAction(hasTag ? "undo_remove_label" : "undo_add_label");
          toggleTag(email.id, tag);
          toast.close(toastId);
        },
      },
    });
    onActionComplete?.();
  };

  const isStarred = email.starred;

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-1">
        {email.location === EmailLocation.inbox ? (
          <Tooltip>
            <TooltipTrigger>
              <Button variant="ghost" size="sm" onClick={handleArchive}>
                <ArchiveX className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Archive</TooltipContent>
          </Tooltip>
        ) : email.location !== EmailLocation.archive ? (
          <Tooltip>
            <TooltipTrigger>
              <Button variant="ghost" size="sm" onClick={handleMoveToInbox}>
                <Inbox className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Move to Inbox</TooltipContent>
          </Tooltip>
        ) : null}
        {email.location !== EmailLocation.trash && (
          <Tooltip>
            <TooltipTrigger>
              <Button variant="ghost" size="sm" onClick={handleDelete}>
                <Trash2 className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger>
            <Button variant="ghost" size="sm" onClick={handleStar}>
              <StarIcon
                className={`size-3 ${isStarred ? "fill-yellow-400 text-yellow-400" : ""}`}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isStarred ? "Unstar" : "Star"}</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  // Full variant (for EmailDetail)
  return (
    <div className="flex items-center gap-2">
      {email.location === EmailLocation.inbox ? (
        <Tooltip>
          <TooltipTrigger>
            <Button variant="ghost" size="icon" onClick={handleArchive}>
              <ArchiveX className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Archive</TooltipContent>
        </Tooltip>
      ) : email.location !== EmailLocation.archive ? (
        <Tooltip>
          <TooltipTrigger>
            <Button variant="ghost" size="icon" onClick={handleMoveToInbox}>
              <Inbox className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Move to Inbox</TooltipContent>
        </Tooltip>
      ) : null}
      {email.location !== EmailLocation.trash && (
        <Tooltip>
          <TooltipTrigger>
            <Button variant="ghost" size="icon" onClick={handleDelete}>
              <Trash2 className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete</TooltipContent>
        </Tooltip>
      )}
      <Tooltip>
        <TooltipTrigger>
          <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
            <Reply className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Reply</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger>
          <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
            <Forward className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Forward</TooltipContent>
      </Tooltip>
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Tooltip>
            <TooltipTrigger>
              <Button size="icon" variant="ghost" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>More actions</TooltipContent>
          </Tooltip>
        </DropdownMenuTrigger>
        <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            {email.unread ? (
              <DropdownMenuItem onClick={(e) => handleMarkAsRead(true, e)}>
                Mark as Read
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={(e) => handleMarkAsRead(false, e)}>
                Mark as Unread
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleStar}>
              <StarIcon
                className={`size-4 mr-2 ${isStarred ? "fill-yellow-400 text-yellow-400" : ""}`}
              />
              {isStarred ? "Unstar" : "Star"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
              <Clock className="size-4 mr-2" />
              Snooze
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Move to</DropdownMenuLabel>
            {email.location !== EmailLocation.inbox && (
              <DropdownMenuItem
                onClick={(e) => handleMoveToLocation(EmailLocation.inbox, e)}
              >
                Inbox
              </DropdownMenuItem>
            )}
            {email.location !== EmailLocation.archive && (
              <DropdownMenuItem
                onClick={(e) => handleMoveToLocation(EmailLocation.archive, e)}
              >
                Archive
              </DropdownMenuItem>
            )}
            {email.location !== EmailLocation.spam && (
              <DropdownMenuItem
                onClick={(e) => handleMoveToLocation(EmailLocation.spam, e)}
              >
                Spam
              </DropdownMenuItem>
            )}
            {email.location !== EmailLocation.trash && (
              <DropdownMenuItem
                onClick={(e) => handleMoveToLocation(EmailLocation.trash, e)}
              >
                Trash
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Labels</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={email.tags.includes(EmailTag.important)}
              onCheckedChange={() => handleToggleTag(EmailTag.important)}
            >
              Important
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={email.tags.includes(EmailTag.work)}
              onCheckedChange={() => handleToggleTag(EmailTag.work)}
            >
              Work
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={email.tags.includes(EmailTag.personal)}
              onCheckedChange={() => handleToggleTag(EmailTag.personal)}
            >
              Personal
            </DropdownMenuCheckboxItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
