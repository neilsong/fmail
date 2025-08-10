import type { Email } from "@/components/email/EmailListItem";
import { create } from "zustand";

interface EmailStore {
  selectedEmail: Email | null;
  currentView: "home" | "detail";
  sidebarOpen: boolean;

  setSelectedEmail: (email: Email) => void;
  setCurrentView: (view: "home" | "detail") => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  goBack: () => void;
}

export const useEmailStore = create<EmailStore>((set) => ({
  selectedEmail: null,
  currentView: "home",
  sidebarOpen: false,

  setSelectedEmail: (email) => set({ selectedEmail: email, currentView: "detail" }),
  setCurrentView: (view) => set({ currentView: view }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  goBack: () => set({ selectedEmail: null, currentView: "home" }),
}));
