"use client";

import React, { ReactNode } from "react";
import { useInstitution } from "@/services/institutionService";
import { useRouter, usePathname } from "next/navigation";

export default function InstitutionLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { isAuthenticated, initialized } = useInstitution();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!initialized) return;
    if (!isAuthenticated && pathname !== "/institution/login") {
      router.push("/institution/login");
    }
  }, [initialized, isAuthenticated, router, pathname]);

  // Wait for initialization before rendering protected routes
  if (!initialized) return null;

  if (!isAuthenticated && pathname !== "/institution/login") {
    return null;
  }

  return <div className="min-h-screen">{children}</div>;
}
