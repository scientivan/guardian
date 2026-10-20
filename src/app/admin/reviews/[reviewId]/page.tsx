import { ReviewScreen } from "@/components/admin/ReviewScreen";
export default async function Page({params}:{params:Promise<{reviewId:string}>}){return <ReviewScreen id={(await params).reviewId}/>;}
