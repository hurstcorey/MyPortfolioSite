import React, { ReactNode } from "react";
import AuthProvider from "@/app/components/Mail/AuthProvider";
import ProtectedRoute from "@/app/components/Mail/ProtectedRoute";

export const metadata = {
  title: "Mail",
  robots: { index: false, follow: false },
};

// Everything under /mail is the email client app; nothing inside renders
// without a signed-in user.
export default function MailLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ProtectedRoute>{children}</ProtectedRoute>
    </AuthProvider>
  );
}
