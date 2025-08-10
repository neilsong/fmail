import { mockEmails } from "@/data/emails";
import { workflowService } from "@/services/WorkflowService";
import type { Email, EmailLocation, EmailTag } from "@/store/email.schema";
import { EmailLocation as EL } from "@/store/email.schema";
import { create } from "zustand";

interface EmailStore {
  emails: Email[];
  selectedEmail: Email | null;
  currentView: "home" | "detail";
  currentLocation: EmailLocation | "all";
  currentTag: EmailTag | null;
  showStarred: boolean;
  sidebarOpen: boolean;
  searchQuery: string;
  composeModalOpen: boolean;

  setEmails: (emails: Email[]) => void;
  setSelectedEmail: (email: Email | null) => void;
  setCurrentView: (view: "home" | "detail") => void;
  setCurrentLocation: (location: EmailLocation | "all") => void;
  setCurrentTag: (tag: EmailTag | null) => void;
  setShowStarred: (show: boolean) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  goBack: () => void;
  openComposeModal: () => void;
  closeComposeModal: () => void;
  sendEmail: (emailData: { to: string; cc: string; bcc: string; subject: string; body: string }) => void;

  moveEmail: (emailId: number, location: EmailLocation) => void;
  toggleStarred: (emailId: number) => void;
  toggleTag: (emailId: number, tag: EmailTag) => void;
  addTag: (emailId: number, tag: EmailTag) => void;
  removeTag: (emailId: number, tag: EmailTag) => void;
  markAsRead: (emailId: number, read: boolean) => void;
  deleteEmail: (emailId: number) => void;

  getFilteredEmails: () => Email[];
  getLocationCount: (location: EmailLocation) => number;
  getStarredCount: () => number;
  getTagCount: (tag: EmailTag) => number;
}

export const useEmailStore = create<EmailStore>((set, get) => ({
  emails: mockEmails,
  selectedEmail: null,
  currentView: "home",
  currentLocation: EL.inbox,
  currentTag: null,
  showStarred: false,
  sidebarOpen: false,
  searchQuery: "",
  composeModalOpen: false,

  setEmails: (emails) => set({ emails }),
  setSelectedEmail: (email) =>
    set({ selectedEmail: email, currentView: email ? "detail" : "home" }),
  setCurrentView: (view) => set({ currentView: view }),
  setCurrentLocation: (location) => set({ currentLocation: location, currentTag: null, showStarred: false }),
  setCurrentTag: (tag) => set({ currentTag: tag, showStarred: false }),
  setShowStarred: (show) => set({ showStarred: show, currentTag: null }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  goBack: () => set({ selectedEmail: null, currentView: "home" }),
  openComposeModal: () => set({ composeModalOpen: true }),
  closeComposeModal: () => set({ composeModalOpen: false }),

  sendEmail: (emailData) => {
    const newEmail: Email = {
      id: Date.now(), // Generate unique ID
      from: "me@example.com", // TODO: Get from user settings
      email: "me@example.com",
      subject: emailData.subject,
      preview: emailData.body.substring(0, 100) + (emailData.body.length > 100 ? "..." : ""),
      time: new Date().toLocaleString(),
      unread: false,
      starred: false,
      hasAttachment: false,
      location: "sent",
      tags: [],
    };

    set((state) => ({
      emails: [...state.emails, newEmail],
      composeModalOpen: false,
    }));
  },

  moveEmail: (emailId, location) =>
    set((state) => ({
      emails: state.emails.map((email) =>
        email.id === emailId ? { ...email, location } : email
      ),
      selectedEmail:
        state.selectedEmail?.id === emailId
          ? { ...state.selectedEmail, location }
          : state.selectedEmail,
      currentView: "home", // Return to home view when email is moved
    })),

  toggleStarred: (emailId) =>
    set((state) => ({
      emails: state.emails.map((email) =>
        email.id === emailId ? { ...email, starred: !email.starred } : email
      ),
      selectedEmail:
        state.selectedEmail?.id === emailId
          ? { ...state.selectedEmail, starred: !state.selectedEmail.starred }
          : state.selectedEmail,
    })),

  toggleTag: (emailId, tag) =>
    set((state) => {
      const email = state.emails.find((e) => e.id === emailId);
      if (!email) return state;

      const hasTag = email.tags.includes(tag);
      const newTags = hasTag ? email.tags.filter((t) => t !== tag) : [...email.tags, tag];

      return {
        emails: state.emails.map((e) => (e.id === emailId ? { ...e, tags: newTags } : e)),
        selectedEmail:
          state.selectedEmail?.id === emailId
            ? { ...state.selectedEmail, tags: newTags }
            : state.selectedEmail,
      };
    }),

  addTag: (emailId, tag) =>
    set((state) => ({
      emails: state.emails.map((email) =>
        email.id === emailId && !email.tags.includes(tag)
          ? { ...email, tags: [...email.tags, tag] }
          : email
      ),
      selectedEmail:
        state.selectedEmail?.id === emailId && !state.selectedEmail.tags.includes(tag)
          ? { ...state.selectedEmail, tags: [...state.selectedEmail.tags, tag] }
          : state.selectedEmail,
    })),

  removeTag: (emailId, tag) =>
    set((state) => ({
      emails: state.emails.map((email) =>
        email.id === emailId
          ? { ...email, tags: email.tags.filter((t) => t !== tag) }
          : email
      ),
      selectedEmail:
        state.selectedEmail?.id === emailId
          ? {
              ...state.selectedEmail,
              tags: state.selectedEmail.tags.filter((t) => t !== tag),
            }
          : state.selectedEmail,
    })),

  markAsRead: (emailId, read) =>
    set((state) => {
      // Find the email to track the action
      const email = state.emails.find((e) => e.id === emailId);
      
      if (email && read && email.unread) {
        // Initialize workflow service if needed
        workflowService.initialize("user123");
        
        // Track mark_read action
        workflowService.trackAction({
          action: "mark_read",
          email: {
            id: String(email.id),
            sender: email.from,
            subject: email.subject,
            labels: (email.tags || []).map(tag => String(tag))
          },
          context: {
            location: "detail"
          }
        });
      }
      
      return {
        emails: state.emails.map((email) =>
          email.id === emailId ? { ...email, unread: !read } : email
        ),
        selectedEmail:
          state.selectedEmail?.id === emailId
            ? { ...state.selectedEmail, unread: !read }
            : state.selectedEmail,
      };
    }),

  deleteEmail: (emailId) =>
    set((state) => ({
      emails: state.emails.map((email) =>
        email.id === emailId ? { ...email, location: EL.trash } : email
      ),
      selectedEmail:
        state.selectedEmail?.id === emailId
          ? { ...state.selectedEmail, location: EL.trash }
          : state.selectedEmail,
      currentView: "home", // Return to home view when email is deleted
    })),

  getFilteredEmails: () => {
    const state = get();
    let filtered = state.emails;

    if (state.currentLocation !== "all") {
      filtered = filtered.filter((email) => email.location === state.currentLocation);
    }

    if (state.showStarred) {
      filtered = filtered.filter((email) => email.starred);
    }

    if (state.currentTag !== null) {
      filtered = filtered.filter((email) => email.tags.includes(state.currentTag!));
    }

    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (email) =>
          email.from.toLowerCase().includes(query) ||
          email.subject.toLowerCase().includes(query) ||
          email.preview.toLowerCase().includes(query) ||
          email.email.toLowerCase().includes(query)
      );
    }

    return filtered;
  },

  getLocationCount: (location) => {
    const state = get();
    return state.emails.filter((email) => email.location === location).length;
  },

  getStarredCount: () => {
    const state = get();
    return state.emails.filter((email) => email.starred).length;
  },

  getTagCount: (tag) => {
    const state = get();
    return state.emails.filter((email) => email.tags.includes(tag)).length;
  },
}));
