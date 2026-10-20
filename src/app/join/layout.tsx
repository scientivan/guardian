import type { ReactNode } from "react";
import { ProtectedApp } from "@/components/auth/ProtectedApp";
export default function JoinLayout({ children }: { children: ReactNode }) { return <ProtectedApp>{children}</ProtectedApp>; }
