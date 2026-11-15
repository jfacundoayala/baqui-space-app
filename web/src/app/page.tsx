import Seccion1 from "@/views/1-visor/Seccion1";
import Seccion2 from "@/views/2-operaciones/Seccion2";
import Seccion3 from "@/views/3-impacto/Seccion3";
import Seccion4 from "@/views/4-demo/Seccion4";
import Seccion5 from "@/views/5-resultados/Seccion5";

// Landing de una sola página: 5 secciones, una pantalla cada una.
export default function Home() {
  return (
    <main>
      <Seccion1 />
      <Seccion2 />
      <Seccion3 />
      <Seccion4 />
      <Seccion5 />
    </main>
  );
}
