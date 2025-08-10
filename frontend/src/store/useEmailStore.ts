import { mockEmails } from "@/data/emails";
import type { Email, EmailLocation, EmailTag } from "@/store/email.schema";
import { EmailLocation as EL } from "@/store/email.schema";
import { create } from "zustand";

interface EmailStore {
  emails: Email[];
  selectedEmail: Email | null;
  currentView: "home" | "detail";
  currentLocation: EmailLocation | "all";
  currentTag: EmailTag | null;
  sidebarOpen: boolean;
  searchQuery: string;

  setEmails: (emails: Email[]) => void;
  setSelectedEmail: (email: Email | null) => void;
  setCurrentView: (view: "home" | "detail") => void;
  setCurrentLocation: (location: EmailLocation | "all") => void;
  setCurrentTag: (tag: EmailTag | null) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  goBack: () => void;

  moveEmail: (emailId: number, location: EmailLocation) => void;
  toggleTag: (emailId: number, tag: EmailTag) => void;
  addTag: (emailId: number, tag: EmailTag) => void;
  removeTag: (emailId: number, tag: EmailTag) => void;
  markAsRead: (emailId: number, read: boolean) => void;
  deleteEmail: (emailId: number) => void;

  getFilteredEmails: () => Email[];
  getLocationCount: (location: EmailLocation) => number;
  getTagCount: (tag: EmailTag) => number;
}

export const useEmailStore = create<EmailStore>((set, get) => ({
  emails: mockEmails,
  selectedEmail: null,
  currentView: "home",
  currentLocation: EL.inbox,
  currentTag: null,
  sidebarOpen: false,
  searchQuery: "",

  setEmails: (emails) => set({ emails }),
  setSelectedEmail: (email) =>
    set({ selectedEmail: email, currentView: email ? "detail" : "home" }),
  setCurrentView: (view) => set({ currentView: view }),
  setCurrentLocation: (location) => set({ currentLocation: location, currentTag: null }),
  setCurrentTag: (tag) => set({ currentTag: tag }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  goBack: () => set({ selectedEmail: null, currentView: "home" }),

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
    set((state) => ({
      emails: state.emails.map((email) =>
        email.id === emailId ? { ...email, unread: !read } : email
      ),
      selectedEmail:
        state.selectedEmail?.id === emailId
          ? { ...state.selectedEmail, unread: !read }
          : state.selectedEmail,
    })),

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

  getTagCount: (tag) => {
    const state = get();
    return state.emails.filter((email) => email.tags.includes(tag)).length;
  },
}));
