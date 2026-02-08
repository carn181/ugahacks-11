"use client";

import React, { ReactNode } from "react";
import { useInstitution } from "@/services/institutionService";
import { useRouter } from "next/navigation";

export default function InstitutionLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { isInstitutionAuthenticated } = useInstitution();
  const router = useRouter();

  // Check authentication for protected routes
  React.useEffect(() => {
    if (isInstitutionAuthenticated() === false) {
      router.push("/institution/login");
    }
  }, [isInstitutionAuthenticated, router]);

  // Don't render while checking auth
  if (isInstitutionAuthenticated() === false) {
    return null;
  }

  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}