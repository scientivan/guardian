import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authOptions } from "@/server/auth";
import { ownerDatabase, WorkspaceStore } from "@/server/workspace";
import { accountWorkspace } from "@/server/api";
import { ZodError } from "zod";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  try { return NextResponse.json(await accountWorkspace(session), { headers: { "Cache-Control": "no-store" } }); }
  catch {return NextResponse.json({error:"Couldn’t open your care cases. Please try again."},{status:503});}
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const db = ownerDatabase(session.user.id);
  try {
    const input=await request.json();
    // Google cases name a hospital from the directory only; free text cannot create a hospital.
    if(session.user.mode==="google" && !input?.hospitalDirectoryId) return NextResponse.json({ error: "Choose a hospital from the directory, or add it and wait for its review.", code: "INVALID_INPUT" }, { status: 400 });
    const store=new WorkspaceStore(db,session.user.mode,session.user.name??"You");
    const created=store.create(input);
    return NextResponse.json(store.view(created.case.id));
  }
  catch (e) {
    const message = e instanceof ZodError ? e.issues.find(i => i.code === "custom")?.message : e instanceof Error && !(e instanceof SyntaxError) ? e.message : undefined;
    return NextResponse.json({ error: message ?? "Check the patient, hospital and account details.", code: "INVALID_INPUT" }, { status: 400 });
  }
  finally { db.close(); }
}
