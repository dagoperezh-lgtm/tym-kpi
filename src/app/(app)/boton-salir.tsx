"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BotonSalir() {
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);

  async function salir() {
    setSaliendo(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={salir}
      disabled={saliendo}
      className="text-xs font-medium text-slate-400 hover:text-slate-600"
    >
      Salir
    </button>
  );
}
