import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { workflowService } from "@/services/WorkflowService";
import type { Email } from "@/store/email.schema";
import { useEmailStore } from "@/store/useEmailStore";
import { ArrowLeftIcon } from "lucide-react";
import { useEffect } from "react";
import { EmailActions } from "./EmailActions";

interface EmailDetailProps {
  email: Email;
  onBack: () => void;
}

export const EmailDetail = ({ email, onBack }: EmailDetailProps) => {
  const { markAsRead } = useEmailStore();

  // Set up intersection observer for the email content
  const { ref: contentRef } = useIntersectionObserver<HTMLDivElement>({
    threshold: 0.3, // Mark as read when 30% of content is visible
    enabled: email.unread, // Only observe if email is unread
    onIntersect: () => {
      // Mark email as read when content becomes visible
      if (email.unread) {
        markAsRead(email.id, true);
      }
    },
  });

  // Track email open on mount and close on unmount
  useEffect(() => {
    // Initialize the singleton workflow service
    workflowService.initialize("user123");

    // Track email open when component mounts
    workflowService.trackAction({
      action: "open",
      email: {
        id: String(email.id),
        sender: email.from,
        subject: email.subject,
        labels: (email.tags || []).map((tag) => String(tag)),
      },
      context: {
        location: "detail",
      },
    });

    return () => {
      // Track email close when component unmounts
      workflowService.trackAction({
        action: "close",
        email: {
          id: String(email.id),
          sender: email.from,
          subject: email.subject,
          labels: (email.tags || []).map((tag) => String(tag)),
        },
        context: {
          location: "detail",
        },
      });
    };
  }, [email.id, email.from, email.subject, email.tags]);

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
            <EmailActions email={email} variant="full" context="detail" />
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
        <div ref={contentRef} className="whitespace-pre-wrap p-4 text-sm leading-relaxed">
          {email.preview}
        </div>
      </ScrollArea>
    </div>
  );
};
