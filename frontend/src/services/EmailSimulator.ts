import { useEmailStore } from "@/store/useEmailStore";
import { workflowService } from "@/services/WorkflowService";
import { loadHillaryEmails, loadHillaryReceivedEmails } from "@/data/hillaryEmailLoader";
import type { Email } from "@/store/email.schema";

/**
 * Email simulation service that manages incoming email simulation
 * Loads first 200 emails initially, then periodically adds new emails from pending list
 */
class EmailSimulator {
  private static instance: EmailSimulator | null = null;
  private pendingEmails: Email[] = [];
  private simulationInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private readonly INITIAL_EMAIL_COUNT = 200;
  private readonly MIN_INTERVAL = 4000; // Minimum 4 seconds
  private readonly MAX_INTERVAL = 6000; // Maximum 6 seconds

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): EmailSimulator {
    if (!EmailSimulator.instance) {
      EmailSimulator.instance = new EmailSimulator();
    }
    return EmailSimulator.instance;
  }

  /**
   * Initialize the email simulator
   * Loads all available emails and splits them into initial and pending
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log("📧 EmailSimulator already initialized");
      return;
    }

    console.log("🚀 EmailSimulator: Loading all available emails...");

    try {
      // Load all available emails from both sources
      const [sentEmails, receivedEmails] = await Promise.all([
        loadHillaryEmails(),
        loadHillaryReceivedEmails()
      ]);

      // Prioritize received emails (inbox) for simulation, then add sent emails
      // This ensures users see emails in their inbox, not just sent folder
      const inboxEmails = receivedEmails.filter(email => email.location === 'inbox');
      const otherEmails = [...sentEmails, ...receivedEmails.filter(email => email.location !== 'inbox')];
      
      // Combine with inbox emails first, then others, sorted by time (newest first)
      const allEmails = [...inboxEmails, ...otherEmails].sort((a, b) => 
        new Date(b.time).getTime() - new Date(a.time).getTime()
      );

      console.log(`📊 EmailSimulator: ${inboxEmails.length} inbox emails, ${otherEmails.length} other emails`);

      console.log(`📊 EmailSimulator: Loaded ${allEmails.length} total emails`);

      // Split emails: last 200 for initial load, first (newest) for simulation
      // This ensures simulated emails are newer than initial emails
      const totalEmails = allEmails.length;
      const simulationCount = Math.min(totalEmails, this.INITIAL_EMAIL_COUNT);
      
      // Take newest emails for simulation, older emails for initial load
      this.pendingEmails = allEmails.slice(0, simulationCount).reverse(); // Reverse to simulate oldest-to-newest
      const initialEmails = allEmails.slice(simulationCount);

      console.log(`📥 EmailSimulator: ${initialEmails.length} emails for initial load`);
      console.log(`⏳ EmailSimulator: ${this.pendingEmails.length} emails pending for simulation`);

      // Set initial emails in the store
      const emailStore = useEmailStore.getState();
      emailStore.setEmails(initialEmails);

      this.isInitialized = true;
      console.log("✅ EmailSimulator: Initialization complete");

    } catch (error) {
      console.error("❌ EmailSimulator: Failed to initialize:", error);
      throw error;
    }
  }

  /**
   * Start the email simulation
   * Periodically adds emails from pending list to simulate receiving new emails
   */
  startSimulation(): void {
    if (!this.isInitialized) {
      console.warn("⚠️ EmailSimulator: Cannot start simulation - not initialized");
      return;
    }

    if (this.simulationInterval) {
      console.log("📧 EmailSimulator: Simulation already running");
      return;
    }

    console.log("🎬 EmailSimulator: Starting email simulation...");
    this.scheduleNextEmail();
  }

  /**
   * Stop the email simulation
   */
  stopSimulation(): void {
    if (this.simulationInterval) {
      clearTimeout(this.simulationInterval);
      this.simulationInterval = null;
      console.log("⏹️ EmailSimulator: Simulation stopped");
    }
  }

  /**
   * Schedule the next email to be "received"
   */
  private scheduleNextEmail(): void {
    if (this.pendingEmails.length === 0) {
      console.log("📭 EmailSimulator: No more pending emails - simulation complete");
      return;
    }

    // Random interval between min and max for realistic timing
    const randomInterval = Math.floor(
      Math.random() * (this.MAX_INTERVAL - this.MIN_INTERVAL) + this.MIN_INTERVAL
    );

    this.simulationInterval = setTimeout(() => {
      this.simulateReceiveEmail();
      this.scheduleNextEmail(); // Schedule the next one
    }, randomInterval);

    console.log(`⏰ EmailSimulator: Next email in ${Math.round(randomInterval / 1000)}s`);
  }

  /**
   * Simulate receiving a new email
   */
  private async simulateReceiveEmail(): Promise<void> {
    if (this.pendingEmails.length === 0) {
      return;
    }

    // Get the next email from pending list
    const newEmail = this.pendingEmails.shift()!;
    
    console.log(`📨 EmailSimulator: Simulating new email from ${newEmail.from}`);
    console.log(`   Subject: ${newEmail.subject}`);

    // Add to email store
    const emailStore = useEmailStore.getState();
    emailStore.addEmails([newEmail]);

    // Trigger workflow processing for the new email
    try {
      const results = await workflowService.handleIncomingEmail(newEmail);
      if (results.length > 0) {
        console.log(`🔧 EmailSimulator: Executed ${results.length} workflows for new email`);
      }
    } catch (error) {
      console.error("❌ EmailSimulator: Error processing workflows for new email:", error);
    }

    console.log(`📊 EmailSimulator: ${this.pendingEmails.length} emails remaining in queue`);
  }

  /**
   * Get simulation status
   */
  getStatus(): {
    isInitialized: boolean;
    isRunning: boolean;
    pendingCount: number;
    totalProcessed: number;
  } {
    const emailStore = useEmailStore.getState();
    return {
      isInitialized: this.isInitialized,
      isRunning: this.simulationInterval !== null,
      pendingCount: this.pendingEmails.length,
      totalProcessed: emailStore.emails.length
    };
  }

  /**
   * Manually trigger receiving the next email (for testing)
   */
  async receiveNextEmail(): Promise<void> {
    await this.simulateReceiveEmail();
  }

  /**
   * Add custom emails to the pending queue
   */
  addToPendingQueue(emails: Email[]): void {
    this.pendingEmails.push(...emails);
    console.log(`📥 EmailSimulator: Added ${emails.length} emails to pending queue`);
  }

  /**
   * Clear all pending emails
   */
  clearPendingQueue(): void {
    this.pendingEmails = [];
    console.log("🗑️ EmailSimulator: Cleared pending email queue");
  }
}

// Export singleton instance
export const emailSimulator = EmailSimulator.getInstance();
