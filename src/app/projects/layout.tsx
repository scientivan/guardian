import type { ReactNode } from "react";
import { ProtectedApp } from "@/components/auth/ProtectedApp";
export default function ProjectsLayout({ children }: { children: ReactNode }) { return <ProtectedApp>{children}</ProtectedApp>; }
