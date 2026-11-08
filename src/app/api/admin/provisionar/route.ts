import { NextRequest, NextResponse } from "next/server";
import { provisionarAtleta } from "@/lib/provisionar";

export async function POST(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json(
      { error: "El servidor todavía no tiene configurada la variable ADMIN_PASSWORD." },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";
  const nombresTexto = typeof body?.nombres === "string" ? body.nombres : "";

  if (password !== adminPassword) {
    return NextResponse.json({ error: "Contraseña de administrador incorrecta." }, { status: 401 });
  }

  const nombres = nombresTexto
    .split("\n")
    .map((n: string) => n.trim())
    .filter((n: string) => n && !n.startsWith("#"));

  if (nombres.length === 0) {
    return NextResponse.json({ error: "No pusiste ningún nombre." }, { status: 400 });
  }

  const baseUrl = request.nextUrl.origin;
  const resultados = [];
  for (const nombre of nombres) {
    resultados.push(await provisionarAtleta(nombre, baseUrl));
  }

  return NextResponse.json({ resultados });
}
