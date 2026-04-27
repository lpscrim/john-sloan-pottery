import type { Metadata } from "next";
import AdminAuthGate from "./AdminAuthGate";
import { AdminBackButton } from "./AdminBackButton";

export const metadata: Metadata = {
  title: "Admin",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
  <div className="min-h-[82svh]">
    <AdminAuthGate>{children}</AdminAuthGate>
    <AdminBackButton />
  </div>
  )
}
