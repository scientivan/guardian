"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAssistant } from "@/components/app/Assistant";
import { useCaseData } from "@/components/app/WorkspaceProvider";

// The assistant is now a window on every case page. Old links to /chat open it on the office.
export default function ChatPage() {
  const { case: care } = useCaseData();
  const { open } = useAssistant();
  const router = useRouter();
  useEffect(() => { open(); router.replace(`/case/${care.id}`); }, [open, router, care.id]);
  return null;
}
