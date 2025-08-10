import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toastManager } from "@/hooks/use-toast";
import { useEmailStore } from "@/store/useEmailStore";
import { Bold, Italic, Link, Paperclip, Send, Smile, Underline, X } from "lucide-react";
import { useState } from "react";

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ComposeModal = ({ isOpen, onClose }: ComposeModalProps) => {
  const { sendEmail } = useEmailStore();
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");

  const handleSend = () => {
    sendEmail({ to, subject, body, cc, bcc });

    // Show success toast
    toastManager.add({
      title: "Email sent successfully!",
      description: `"${subject}" has been sent to ${to}`,
      type: "success",
    });

    // Reset form
    setTo("");
    setSubject("");
    setBody("");
    setCc("");
    setBcc("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium text-gray-700">
              New Message
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-0 p-0">
          {/* To field */}
          <div className="flex items-center border-b border-gray-200 px-4 py-2">
            <span className="w-16 text-sm font-medium text-gray-600">To:</span>
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="Recipients"
              className="border-0 p-0 text-sm shadow-none focus-visible:ring-0"
              onKeyDown={handleKeyDown}
            />
          </div>

          {/* CC field (expandable) */}
          <div className="flex items-center border-b border-gray-200 px-4 py-2">
            <span className="w-16 text-sm font-medium text-gray-600">Cc:</span>
            <Input
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="Cc"
              className="border-0 p-0 text-sm shadow-none focus-visible:ring-0"
              onKeyDown={handleKeyDown}
            />
          </div>

          {/* BCC field (expandable) */}
          <div className="flex items-center border-b border-gray-200 px-4 py-2">
            <span className="w-16 text-sm font-medium text-gray-600">Bcc:</span>
            <Input
              value={bcc}
              onChange={(e) => setBcc(e.target.value)}
              placeholder="Bcc"
              className="border-0 p-0 text-sm shadow-none focus-visible:ring-0"
              onKeyDown={handleKeyDown}
            />
          </div>

          {/* Subject field */}
          <div className="flex items-center border-b border-gray-200 px-4 py-2">
            <span className="w-16 text-sm font-medium text-gray-600">Subject:</span>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="border-0 p-0 text-sm shadow-none focus-visible:ring-0"
              onKeyDown={handleKeyDown}
            />
          </div>

          {/* Body */}
          <div className="px-4 py-3">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message here..."
              className="min-h-[300px] border-0 p-0 text-sm shadow-none resize-none focus-visible:ring-0"
              onKeyDown={handleKeyDown}
            />
          </div>

          {/* Toolbar */}
          <div className="border-t border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                  title="Bold"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                  title="Italic"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                  title="Underline"
                >
                  <Underline className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                  title="Insert Link"
                >
                  <Link className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                  title="Insert Emoji"
                >
                  <Smile className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                  title="Attach Files"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="h-8 px-3"
                >
                  Discard
                </Button>
                <Button
                  size="sm"
                  onClick={handleSend}
                  className="h-8 gap-2 px-4"
                  disabled={!to.trim() || !subject.trim()}
                >
                  <Send className="h-4 w-4" />
                  Send
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
