"use client";

import { SessionProvider as Provider } from "next-auth/react";
import React from "react";

interface SessionProviderProps {
  children: React.ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  return <Provider>{children}</Provider>;
}
