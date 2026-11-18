import { ImageResponse } from "next/og";

// Imagen de vista previa al compartir el enlace (WhatsApp, redes). Se genera una sola vez, en el build.
export const alt = "BAQUI · El estado de los caminos rurales, visto desde el satélite";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Imagen() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 90,
          color: "#ffffff",
          background: "linear-gradient(180deg, #121d33 0%, #0d172b 55%, #1d2d4a 100%)",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, color: "#7cc4ff" }}>Radar NISAR · NASA-ISRO</div>
        <div style={{ display: "flex", fontSize: 210, fontWeight: 700, letterSpacing: -8, lineHeight: 1 }}>BAQUI</div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 44, color: "#c6d3ea", maxWidth: 940 }}>
          Después de la lluvia, nadie sabe si los caminos rurales están transitables. BAQUI te lo dice.
        </div>
      </div>
    ),
    size,
  );
}
