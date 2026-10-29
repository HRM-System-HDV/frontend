"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface TopbarContextType {
  headerTitle: string | null;
  setHeaderTitle: (title: string | null) => void;
  headerActions: ReactNode | null;
  setHeaderActions: (actions: ReactNode | null) => void;
}

const TopbarContext = createContext<TopbarContextType>({
  headerTitle: null,
  setHeaderTitle: () => {},
  headerActions: null,
  setHeaderActions: () => {},
});

export function TopbarProvider({ children }: { children: ReactNode }) {
  const [headerTitle, setHeaderTitle] = useState<string | null>(null);
  const [headerActions, setHeaderActions] = useState<ReactNode | null>(null);

  return (
    <TopbarContext.Provider value={{ headerTitle, setHeaderTitle, headerActions, setHeaderActions }}>
      {children}
    </TopbarContext.Provider>
  );
}

export function useTopbar() {
  return useContext(TopbarContext);
}
