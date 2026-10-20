import type { NextRequest } from "next/server";
import { dispatch } from "@/server/api";

export const maxDuration=180;
async function handler(request:NextRequest,{params}:{params:Promise<{path:string[]}>}) {return dispatch(request,(await params).path);}
export {handler as GET,handler as POST,handler as DELETE};
