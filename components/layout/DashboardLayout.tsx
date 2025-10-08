"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { OfflineIndicator } from "./OfflineIndicator";

interface DashboardLayoutProps {
  children: React.ReactNode;
  onSearch?: (query: string) => void;
}

export function DashboardLayout({
  children,
  onSearch,
}: DashboardLayoutProps): JSX.Element {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  React.useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/auth/signin");
    }
  }, [session, isPending, router]);

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return <div />;
  }

  return (
    <>
      <OfflineIndicator />
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header onSearch={onSearch} />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </>
  );
}
