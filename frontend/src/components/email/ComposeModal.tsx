import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toastManager } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useEmailStore } from "@/store/useEmailStore";
import {
  Bold,
  ChevronDown,
  ChevronUp,
  Italic,
  Link,
  Loader2,
  Paperclip,
  Send,
  Smile,
  Sparkles,
  Underline,
} from "lucide-react";
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
  const [showCcBcc, setShowCcBcc] = useState(false);

  // AI mode state
  const [bulletPoints, setBulletPoints] = useState("");
  const [tone, setTone] = useState("friendly");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<{
    subject: string;
    body: string;
  } | null>(null);
  const [generatedEmailId, setGeneratedEmailId] = useState<string>("");

  const handleSend = async () => {
    // Send the email
    sendEmail({
      to,
      subject: generatedContent ? generatedContent.subject : subject,
      body: generatedContent ? generatedContent.body : body,
      cc,
      bcc,
    });

    // If this was an AI-generated email, analyze the diffs for learning
    if (generatedContent && generatedEmailId) {
      try {
        // First, get the stored original generated content
        const storedResponse = await fetch(
          `${import.meta.env.VITE_API_HOST}/api/stored-email/${generatedEmailId}`
        );
        let originalGeneratedContent = generatedContent; // fallback to current state

        if (storedResponse.ok) {
          const storedData = await storedResponse.json();
          originalGeneratedContent = storedData.generated_content;
        }

        await fetch(`${import.meta.env.VITE_API_HOST}/api/analyze-email-diff`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email_id: generatedEmailId,
            recipient: to || "team",
            generated_content: originalGeneratedContent,
            final_content: {
              subject: generatedContent ? generatedContent.subject : subject,
              body: generatedContent ? generatedContent.body : body,
            },
          }),
        });

        toastManager.add({
          title: "Preferences learned!",
          description:
            "Your email preferences have been saved for future AI generations.",
          type: "success",
        });
      } catch (error) {
        console.error("Failed to analyze email diff:", error);
        // Continue even if analysis fails
      }
    }

    // Show success toast
    toastManager.add({
      title: "Email sent successfully!",
      description: `"${generatedContent ? generatedContent.subject : subject}" has been sent to ${to}`,
      type: "success",
    });

    // Reset form
    resetForm();
    onClose();
  };

  const handleGenerateAI = async () => {
    if (!bulletPoints.trim()) {
      toastManager.add({
        title: "Please enter bullet points",
        description: "Add some bullet points or draft content to generate an email.",
        type: "error",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const requestBody = {
        bullets: bulletPoints.split("\n").filter((bp) => bp.trim()),
        tone: tone,
        recipient: to || "team",
        subject: subject || "Follow-up",
      };
      console.log("Sending generate-email request:", requestBody); // Debug log

      const response = await fetch(
        `${import.meta.env.VITE_API_HOST}/api/generate-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Generated email response:", data); // Debug log
        const emailId = `email_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

        // Check if the response has the expected structure
        const generatedSubject = data.subject || data.generated_subject || "";
        const generatedBody = data.body || data.generated_body || data.content || "";

        // Only set generated content if we have actual content
        if (!generatedBody || generatedBody.trim() === "") {
          console.error("No email body in response. Full response:", data);
          throw new Error(
            "The AI service returned an empty email. Please try again or check if the backend service is configured correctly."
          );
        }

        setGeneratedContent({
          subject: generatedSubject || "Generated Email",
          body: generatedBody,
        });
        setGeneratedEmailId(emailId);

        // Store the generated email for later diff analysis
        try {
          await fetch(`${import.meta.env.VITE_API_HOST}/api/store-generated-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email_id: emailId,
              recipient: to || "team",
              generated_content: {
                subject: generatedSubject,
                body: generatedBody,
              },
            }),
          });
        } catch (error) {
          console.error("Failed to store generated email:", error);
          // Continue even if storage fails
        }

        toastManager.add({
          title: "Email generated!",
          description: "AI has generated your email. You can now edit it before sending.",
          type: "success",
        });
      } else {
        const errorText = await response.text();
        console.error(
          "Generate email failed. Status:",
          response.status,
          "Response:",
          errorText
        );

        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { detail: errorText || "Failed to generate email" };
        }

        throw new Error(
          errorData.detail || errorData.message || "Failed to generate email"
        );
      }
    } catch (error) {
      console.error("Error generating email:", error);

      let errorMessage = "Failed to generate email. Please try again.";

      if (error instanceof TypeError && error.message.includes("fetch")) {
        errorMessage =
          "Cannot connect to the email generation service. Please ensure the backend is running on http://localhost:8000";
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      toastManager.add({
        title: "Generation failed",
        description: errorMessage,
        type: "error",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const resetForm = () => {
    setTo("");
    setSubject("");
    setBody("");
    setCc("");
    setBcc("");
    setBulletPoints("");
    setTone("friendly");
    setGeneratedContent(null);
    setGeneratedEmailId("");
    setShowCcBcc(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl p-0 gap-0 border-0 shadow-lg">
        <DialogHeader className="px-6 py-4 border-b border-gray-100">
          <DialogTitle className="text-base font-medium">New Message</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="normal" className="w-full">
          <div className="px-6 py-3 border-b border-gray-100">
            <TabsList className="grid w-full max-w-[400px] grid-cols-2 p-0.5 rounded-lg">
              <TabsTrigger
                value="normal"
                className="data-[state=active]:shadow-sm text-sm"
              >
                Compose
              </TabsTrigger>
              <TabsTrigger
                value="ai"
                className="data-[state=active]:shadow-sm text-sm gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5 absolute" />
                AI Compose
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="px-6">
            {/* Recipient Fields */}
            <div className="py-3 space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-500 w-12">To</label>
                <Input
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="Recipients"
                  className="flex-1 border-0 px-2 h-8 focus-visible:ring-0 rounded"
                />
              </div>

              <Collapsible open={showCcBcc} onOpenChange={setShowCcBcc}>
                <CollapsibleTrigger>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-gray-500 hover:text-gray-700 p-0 h-auto font-normal"
                  >
                    {showCcBcc ? (
                      <>
                        <ChevronUp className="h-3 w-3 mr-1" />
                        Hide Cc & Bcc
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3 mr-1" />
                        Add Cc & Bcc
                      </>
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 mt-3">
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-500 w-12">Cc</label>
                    <Input
                      value={cc}
                      onChange={(e) => setCc(e.target.value)}
                      placeholder="Cc recipients"
                      className="flex-1 border-0 px-2 h-8 focus-visible:ring-0 rounded"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-500 w-12">Bcc</label>
                    <Input
                      value={bcc}
                      onChange={(e) => setBcc(e.target.value)}
                      placeholder="Bcc recipients"
                      className="flex-1 border-0 px-2 h-8 focus-visible:ring-0 rounded"
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-500 w-12">Subject</label>
                <Input
                  value={generatedContent ? generatedContent.subject : subject}
                  onChange={(e) => {
                    if (generatedContent) {
                      setGeneratedContent({
                        ...generatedContent,
                        subject: e.target.value,
                      });
                    } else {
                      setSubject(e.target.value);
                    }
                  }}
                  placeholder="Subject"
                  className="flex-1 border-0 px-2 h-8 focus-visible:ring-0 rounded"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100">
            <TabsContent value="normal" className="m-0">
              <div className="px-6 py-4">
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your message..."
                  className="min-h-[320px] text-sm resize-none focus-visible:ring-0"
                />
              </div>
            </TabsContent>

            <TabsContent value="ai" className="m-0">
              {!generatedContent ? (
                <div className="px-6 py-4 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Key Points
                    </label>
                    <Textarea
                      value={bulletPoints}
                      onChange={(e) => setBulletPoints(e.target.value)}
                      placeholder="Enter your bullet points or draft content here..."
                      className="min-h-[200px] border-gray-200 text-sm resize-none focus:ring-0"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleGenerateAI}
                      disabled={isGenerating || !bulletPoints.trim()}
                      className="gap-2 bg-primary hover:bg-primary/90 shadow-none"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Generate Email
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="px-6 py-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Generated Email
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setGeneratedContent(null)}
                      className="h-7 px-2 text-xs border-gray-200 shadow-none"
                    >
                      Regenerate
                    </Button>
                  </div>
                  <Textarea
                    value={generatedContent.body}
                    onChange={(e) =>
                      setGeneratedContent({ ...generatedContent, body: e.target.value })
                    }
                    className="min-h-[280px] border-gray-200 text-sm resize-none focus:ring-0"
                  />
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer with Toolbar */}
        <div className="border-t border-gray-100 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger>
                  <Toggle
                    value="bold"
                    aria-label="Bold"
                    className="h-8 w-8 p-0 border-0 shadow-none"
                  >
                    <Bold className="h-4 w-4" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>Bold</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger>
                  <Toggle
                    value="italic"
                    aria-label="Italic"
                    className="h-8 w-8 p-0 border-0 shadow-none"
                  >
                    <Italic className="h-4 w-4" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>Italic</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger>
                  <Toggle
                    value="underline"
                    aria-label="Underline"
                    className="h-8 w-8 p-0 border-0 shadow-none"
                  >
                    <Underline className="h-4 w-4" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>Underline</TooltipContent>
              </Tooltip>

              <div className="w-px h-5 mx-1" />

              <Tooltip>
                <TooltipTrigger>
                  <Toggle
                    value="link"
                    aria-label="Insert Link"
                    className="h-8 w-8 p-0 border-0 shadow-none"
                  >
                    <Link className="h-4 w-4" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>Insert Link</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger>
                  <Toggle
                    value="emoji"
                    aria-label="Insert Emoji"
                    className="h-8 w-8 p-0 border-0 shadow-none"
                  >
                    <Smile className="h-4 w-4" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>Insert Emoji</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger>
                  <Toggle
                    value="attachment"
                    aria-label="Attach Files"
                    className="h-8 w-8 p-0 border-0 shadow-none"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>Attach Files</TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetForm}
                className="h-8 px-3 border-gray-200 shadow-none"
              >
                Discard
              </Button>
              <Button
                size="sm"
                onClick={handleSend}
                className={cn(
                  "h-8 gap-1.5 px-4 shadow-none",
                  "bg-primary hover:bg-primary/90"
                )}
                disabled={
                  !to.trim() ||
                  (!generatedContent && !subject.trim()) ||
                  (!!generatedContent && !generatedContent?.body.trim())
                }
              >
                <Send className="h-3.5 w-3.5" />
                Send
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
