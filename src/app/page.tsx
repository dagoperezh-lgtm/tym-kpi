import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/get-sesion";

export default async function Home() {
  const sesion = await obtenerSesion();
  redirect(sesion ? "/club" : "/login");
}
