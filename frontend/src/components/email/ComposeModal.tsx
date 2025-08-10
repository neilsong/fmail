import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { X, Send, Paperclip, Bold, Italic, Underline, Link, Smile, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEmailStore } from "@/store/useEmailStore";
import { toastManager } from "@/hooks/use-toast";

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
  
  // AI mode state
  const [isAIMode, setIsAIMode] = useState(false);
  const [bulletPoints, setBulletPoints] = useState("");
  const [tone, setTone] = useState("friendly");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<{ subject: string; body: string } | null>(null);
  const [generatedEmailId, setGeneratedEmailId] = useState<string>("");

  const handleSend = async () => {
    // Send the email
    sendEmail({ to, subject: isAIMode && generatedContent ? generatedContent.subject : subject, body: isAIMode && generatedContent ? generatedContent.body : body, cc, bcc });

    // If this was an AI-generated email, analyze the diffs for learning
    if (isAIMode && generatedContent && generatedEmailId) {
      try {
        // First, get the stored original generated content
        const storedResponse = await fetch(`http://localhost:8000/api/stored-email/${generatedEmailId}`);
        let originalGeneratedContent = generatedContent; // fallback to current state
        
        if (storedResponse.ok) {
          const storedData = await storedResponse.json();
          originalGeneratedContent = storedData.generated_content;
        }
        
        await fetch('http://localhost:8000/api/analyze-email-diff', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email_id: generatedEmailId,
            recipient: to || "team",
            generated_content: originalGeneratedContent,
            final_content: {
              subject: isAIMode && generatedContent ? generatedContent.subject : subject,
              body: isAIMode && generatedContent ? generatedContent.body : body
            }
          })
        });
        
        toastManager.add({
          title: "Preferences learned!",
          description: "Your email preferences have been saved for future AI generations.",
          type: "success",
        });
      } catch (error) {
        console.error('Failed to analyze email diff:', error);
        // Continue even if analysis fails
      }
    }

    // Show success toast
    toastManager.add({
      title: "Email sent successfully!",
      description: `"${isAIMode && generatedContent ? generatedContent.subject : subject}" has been sent to ${to}`,
      type: "success",
    });

    // Reset form
    setTo("");
    setSubject("");
    setBody("");
    setCc("");
    setBcc("");
    setBulletPoints("");
    setTone("friendly");
    setGeneratedContent(null);
    setGeneratedEmailId("");
    setIsAIMode(false);
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
      const response = await fetch('http://localhost:8000/api/generate-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bullets: bulletPoints.split('\n').filter(bp => bp.trim()),
          tone: tone,
          recipient: to || "team",
          subject: subject || "Follow-up"
        })
      });

      if (response.ok) {
        const data = await response.json();
        const emailId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        setGeneratedContent({
          subject: data.subject,
          body: data.body
        });
        setGeneratedEmailId(emailId);
        
        // Store the generated email for later diff analysis
        try {
          await fetch('http://localhost:8000/api/store-generated-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email_id: emailId,
              recipient: to || "team",
              generated_content: {
                subject: data.subject,
                body: data.body
              }
            })
          });
        } catch (error) {
          console.error('Failed to store generated email:', error);
          // Continue even if storage fails
        }
        
        toastManager.add({
          title: "Email generated!",
          description: "AI has generated your email. You can now edit it before sending.",
          type: "success",
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to generate email');
      }
    } catch (error) {
      console.error('Error generating email:', error);
      toastManager.add({
        title: "Generation failed",
        description: "Failed to generate email. Please try again.",
        type: "error",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
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
    setIsAIMode(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg font-medium text-gray-700">
                {isAIMode ? "AI Compose" : "New Message"}
              </CardTitle>
              <Button
                variant={isAIMode ? "default" : "outline"}
                size="sm"
                onClick={() => setIsAIMode(!isAIMode)}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {isAIMode ? "AI Mode" : "Normal Mode"}
              </Button>
            </div>
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

          {/* CC field */}
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

          {/* BCC field */}
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
              value={isAIMode && generatedContent ? generatedContent.subject : subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="border-0 p-0 text-sm shadow-none focus-visible:ring-0"
              onKeyDown={handleKeyDown}
              disabled={isAIMode && generatedContent !== null}
            />
          </div>

          {/* AI Mode Content */}
          {isAIMode && (
            <>
              {/* Tone Selector */}
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="mb-2">
                  <label className="text-sm font-medium text-gray-600">Tone:</label>
                </div>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full border border-gray-300 p-2 text-sm rounded-md"
                  onKeyDown={handleKeyDown}
                >
                  <option value="friendly">Friendly</option>
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="formal">Formal</option>
                </select>
              </div>

              {/* Bullet Points Input */}
              {!generatedContent && (
                <div className="px-4 py-3 border-b border-gray-200">
                  <div className="mb-2">
                    <label className="text-sm font-medium text-gray-600">Bullet Points / Draft:</label>
                  </div>
                  <Textarea
                    value={bulletPoints}
                    onChange={(e) => setBulletPoints(e.target.value)}
                    placeholder="Enter your bullet points or draft content here..."
                    className="min-h-[150px] border border-gray-300 p-2 text-sm resize-none"
                    onKeyDown={handleKeyDown}
                  />
                  <div className="mt-3 flex justify-end">
                    <Button
                      onClick={handleGenerateAI}
                      disabled={isGenerating || !bulletPoints.trim()}
                      className="gap-2"
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
              )}

              {/* Generated Content (Editable) */}
              {generatedContent && (
                <div className="px-4 py-3 border-b border-gray-200">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-600">Generated Email (Editable):</label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setGeneratedContent(null)}
                      className="h-7 px-2 text-xs"
                    >
                      Regenerate
                    </Button>
                  </div>
                  <Textarea
                    value={generatedContent.body}
                    onChange={(e) => setGeneratedContent({ ...generatedContent, body: e.target.value })}
                    className="min-h-[200px] border border-gray-300 p-2 text-sm resize-none"
                    onKeyDown={handleKeyDown}
                  />
                </div>
              )}
            </>
          )}

          {/* Normal Mode Body */}
          {!isAIMode && (
            <div className="px-4 py-3">
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message here..."
                className="min-h-[300px] border-0 p-0 text-sm shadow-none resize-none focus-visible:ring-0"
                onKeyDown={handleKeyDown}
              />
            </div>
          )}

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
                  onClick={resetForm}
                  className="h-8 px-3"
                >
                  Discard
                </Button>
                <Button
                  size="sm"
                  onClick={handleSend}
                  className="h-8 gap-2 px-4"
                  disabled={
                    !to.trim() || 
                    (!isAIMode && !subject.trim()) ||
                    (isAIMode && !generatedContent) ||
                    (isAIMode && !generatedContent?.body.trim())
                  }
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
