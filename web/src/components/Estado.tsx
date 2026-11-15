import { Check, Droplets, X, TriangleAlert, HelpCircle } from "lucide-react";

// La respuesta al usuario tiene solo 2 opciones: transitable o intransitable (pedido de Facundo, 15/11).
// "cuidado" queda solo para avisos que no son respuestas (por ejemplo, El Niño en curso).
// "mojado" no es una respuesta: rotula lo que midió el radar (zona mojada, sección 5).
export type Tono = "ok" | "cuidado" | "peligro" | "sindato" | "mojado";

const ESTILO: Record<Tono, { icono: typeof Check; clase: string; texto: string }> = {
  ok: { icono: Check, clase: "text-ok bg-ok-bg border-ok/40", texto: "Transitable" },
  cuidado: { icono: TriangleAlert, clase: "text-warn bg-warn-bg border-warn/40", texto: "Aviso" },
  peligro: { icono: X, clase: "text-danger bg-danger-bg border-danger/40", texto: "Intransitable" },
  sindato: { icono: HelpCircle, clase: "text-nodata bg-nodata-bg border-nodata/40", texto: "Sin dato" },
  mojado: { icono: Droplets, clase: "text-accent bg-water/15 border-accent/40", texto: "Zona mojada" },
};

/** Estado siempre con ícono + palabra, nunca solo color. */
export default function Estado({
  tono,
  texto,
  grande = false,
}: {
  tono: Tono;
  texto?: string;
  grande?: boolean;
}) {
  const { icono: Icono, clase, texto: porDefecto } = ESTILO[tono];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border font-semibold ${clase} ${
        grande ? "px-5 py-2.5 text-lg tracking-wide" : "px-3 py-1 text-sm"
      }`}
    >
      <Icono aria-hidden className={grande ? "size-5" : "size-4"} strokeWidth={2.5} />
      {texto ?? porDefecto}
    </span>
  );
}
