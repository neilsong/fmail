import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Email } from "@/store/email.schema";
import { ArrowLeftIcon } from "lucide-react";
import { EmailActions } from "./EmailActions";

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
            <Tooltip>
              <TooltipTrigger>
                <Button variant="ghost" size="icon" onClick={onBack}>
                  <ArrowLeftIcon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Back to inbox</TooltipContent>
            </Tooltip>
            <Separator orientation="vertical" className="mx-1 h-4" />
            <EmailActions email={email} variant="full" />
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
