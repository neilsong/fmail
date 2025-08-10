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
import type { Email } from "./EmailListItem";

interface EmailDetailProps {
  email: Email;
  onBack: () => void;
}

export const EmailDetail = ({ email, onBack }: EmailDetailProps) => {
  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="h-14">
        <div>
          <div className="flex h-14 items-center gap-2 border-b px-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeftIcon className="size-4" />
            </Button>
            <Separator orientation="vertical" className="mx-1 h-4" />
            <Button variant="ghost" size="icon">
              <ArchiveX className="size-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Trash2 className="size-4" />
            </Button>
            <Separator orientation="vertical" className="mx-1 h-4" />
            <Button variant="ghost" size="icon">
              <Reply className="size-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Forward className="size-4" />
            </Button>
            <Separator orientation="vertical" className="mx-1 h-4" />
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button size="icon" variant="ghost">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem>Mark as Read</DropdownMenuItem>
                  <DropdownMenuItem>Mark as Unread</DropdownMenuItem>
                  <DropdownMenuItem>
                    <StarIcon className="size-4" />
                    Star
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Clock className="size-4" />
                    Snooze
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Move to</DropdownMenuLabel>
                  <DropdownMenuItem>Archive</DropdownMenuItem>
                  <DropdownMenuItem>Spam</DropdownMenuItem>
                  <DropdownMenuItem>
                    Trash
                    <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Categories</DropdownMenuLabel>
                  <DropdownMenuItem>Social</DropdownMenuItem>
                  <DropdownMenuItem>Updates</DropdownMenuItem>
                  <DropdownMenuItem>Forums</DropdownMenuItem>
                  <DropdownMenuItem>Promotions</DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Labels</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuCheckboxItem>Important</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem>Work</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem>Personal</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem>To-do</DropdownMenuCheckboxItem>
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
