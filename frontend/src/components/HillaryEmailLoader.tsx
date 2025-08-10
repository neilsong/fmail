import { Button } from "@/components/ui/button";
import { useEmailStore } from "@/store/useEmailStore";
import { useState } from "react";

export function HillaryEmailLoader() {
  const { loadHillaryEmails, emails, removeDuplicates } = useEmailStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoadAllEmails = async () => {
    setLoading(true);
    setError(null);
    try {
      await loadHillaryEmails();
      console.log("All Hillary emails loaded into sent tab");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load emails");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDuplicates = () => {
    removeDuplicates();
  };

  return (
    <div className="p-4 border rounded-lg bg-card">
      <h3 className="text-lg font-semibold mb-4">Load Hillary Clinton Emails</h3>
      <p className="text-sm text-muted-foreground mb-2">
        Current emails in store: {emails.length}
      </p>
      <p className="text-sm text-blue-600 mb-2">
        📧 Hillary emails will be loaded into the "Sent" tab as read emails
      </p>
      <p className="text-sm text-muted-foreground mb-4">
        ✨ Duplicate detection is now active - duplicate emails will be automatically
        filtered
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        <Button onClick={handleLoadAllEmails} disabled={loading} variant="default">
          Load All Emails
        </Button>

        <Button onClick={handleRemoveDuplicates} disabled={loading} variant="secondary">
          Remove Duplicates
        </Button>
      </div>

      {loading && <p className="text-sm text-blue-600">Loading emails...</p>}

      {error && <p className="text-sm text-red-600">Error: {error}</p>}
    </div>
  );
}
