import { AdminHospital } from "@/components/admin/AdminPages";
export default async function Page({params}:{params:Promise<{hospitalId:string}>}){return <AdminHospital id={(await params).hospitalId}/>;}
