"use client";
// Tierra en 3D con three.js y NISAR en su órbita real (TLE de Celestrak propagado con satellite.js).
// Se carga solo en el cliente (next/dynamic con ssr:false desde Seccion1).
// Se puede girar con la mano (mouse o dedo): se mueve la cámara alrededor de la Tierra, así el globo,
// la órbita y NISAR giran juntos y las etiquetas siguen en su lugar.

import { useEffect, useRef, useState } from "react";
import { crearRegulador } from "@/components/regulador";
import * as THREE from "three";
import { ACELERACION, PERIODO_MIN, giroTierra, latLonAEscena, posicionNisar, type Vec3 } from "./orbita";
import { textos } from "./textos";

const t = textos;

const SAN_MARTIN = { lat: -26.537, lon: -59.342 };
// Hacia dónde mira la cámara al cargar. En pantallas grandes: el centro de Sudamérica, un poco al
// norte del Chaco. En el celular el globo asoma abajo y el pie tapa su centro, así que la cámara mira
// más al sur para que el Chaco quede arriba del centro del disco, a la vista.
const MIRA_INICIAL = { lat: -19, lon: -61 };
const MIRA_INICIAL_CELULAR = { lat: -41, lon: -61 };
const ANCHO_LG = 1024; // mismo corte que "lg" de Tailwind
const ACENTO = new THREE.Color("#7cc4ff");
const FOV = 28;
const MARGEN_ENCUADRE = 1.3; // radios terrestres que tienen que entrar en el lado corto
const PUNTOS_ORBITA = 240;
const PUNTOS_ESTELA = 64;
const ESTELA_MIN = PERIODO_MIN * 0.24;
const EJE_Y = new THREE.Vector3(0, 1, 0);

// Girar con la mano.
const INERCIA_FRENO = 2.6; // cuánto frena el giro por inercia (1/s)
const INERCIA_MAX = 5; // rad/s
const PAUSA_AUTO_MS = 2500; // después de soltar, el giro automático espera esto y vuelve suave
const INCLINACION_MAX = 0.55; // rad que se puede inclinar arriba/abajo con el mouse

// NISAR fuera de escala: radios terrestres por metro real. Con 0,03 el reflector de 12 m mide 0,36
// radios (unas 2.000 veces su tamaño real), lo justo para que se reconozca sin tapar el globo.
// En el celular y la tablet el globo es más chico en pantalla, así que NISAR se agranda un poco más.
const ESCALA_M = 0.03;
const ESCALA_M_CELULAR = 0.04;
// Medio ancho aproximado del conjunto (alas solares y reflector), en metros del modelo.
const RADIO_SAT_M = 7.3;
// En el celular y la tablet el lienzo es más alto que el globo (Seccion1: 80svh) para que NISAR no se
// corte arriba. El globo se encuadra en la parte de abajo, que mide lo mismo que antes (56svh).
const FRACCION_GLOBO_CELULAR = 56 / 80;

const VERT = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
// Halo exterior: se ve la cara de atrás de una esfera un poco más grande.
const FRAG_HALO = /* glsl */ `
  uniform vec3 uColor;
  uniform float uFuerza;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    float f = clamp(-dot(vN, vV) / 0.42, 0.0, 1.0);
    f = pow(f, 2.4) * uFuerza;
    gl_FragColor = vec4(uColor * f, f);
  }
`;
// Borde iluminado sobre el disco de la Tierra.
const FRAG_BORDE = /* glsl */ `
  uniform vec3 uColor;
  uniform float uFuerza;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    float f = pow(1.0 - max(dot(vN, vV), 0.0), 3.2) * uFuerza;
    gl_FragColor = vec4(uColor * f, f);
  }
`;

const fmt0 = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const fmt1 = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function textoLatLon(lat: number, lon: number): string {
  const u = t.unidades;
  return `${fmt1.format(Math.abs(lat))}° ${lat >= 0 ? u.norte : u.sur} · ${fmt1.format(Math.abs(lon))}° ${
    lon >= 0 ? u.este : u.oeste
  }`;
}

function aVector(p: Vec3, v = new THREE.Vector3()): THREE.Vector3 {
  return v.set(p.x, p.y, p.z);
}

/** ¿La Tierra (esfera de radio 1) tapa el punto p visto desde c? */
function tapadoPorTierra(c: THREE.Vector3, p: THREE.Vector3): boolean {
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  const dz = p.z - c.z;
  const a = dx * dx + dy * dy + dz * dz;
  const b = 2 * (c.x * dx + c.y * dy + c.z * dz);
  const cc = c.lengthSq() - 1;
  const disc = b * b - 4 * a * cc;
  if (disc <= 0) return false;
  const t1 = (-b - Math.sqrt(disc)) / (2 * a);
  return t1 > 0 && t1 < 1;
}

/**
 * Elige el instante en que arranca la escena para que NISAR se vea desde el primer cuadro:
 * del lado visible del globo, dentro del encuadre, lejos del punto de General San Martín y con
 * varios segundos de recorrido a la vista por delante. Busca desde ahora hasta 8 vueltas después
 * (unas 13 horas): la Tierra gira debajo de la órbita y cambia qué parte se ve desde la cámara.
 */
function elegirInicio(ahoraMs: number, mira: { lat: number; lon: number }, aspecto: number, celular: boolean): number {
  const tanMedio = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const dist = MARGEN_ENCUADRE / (tanMedio * Math.min(1, aspecto)) + 0.4;
  // Todo en ejes de la Tierra (sin girar): la cámara queda fija mirando a "mira" y el satélite se
  // pasa a esos ejes deshaciendo el giro de la Tierra en cada instante.
  const m = aVector(latLonAEscena(mira.lat, mira.lon)).normalize();
  const cam = m.clone().multiplyScalar(dist);
  const arriba = EJE_Y.clone().addScaledVector(m, -m.y).normalize();
  const derecha = new THREE.Vector3().crossVectors(arriba, m);
  const sm = aVector(latLonAEscena(SAN_MARTIN.lat, SAN_MARTIN.lon)).normalize();

  // 100 muestras por vuelta (una por minuto): 800 propagaciones al montar, la mitad que antes.
  const N = 100;
  const total = N * 8;
  const paso = (PERIODO_MIN * 60_000) / N;
  // Por muestra: si se ve (delante, sin taparse, lejos del Chaco) y dónde cae en pantalla.
  const muestras: { ve: boolean; sx: number; sy: number }[] = [];
  const q = new THREE.Vector3();
  const rel = new THREE.Vector3();
  for (let i = 0; i < total; i++) {
    const fecha = new Date(ahoraMs + i * paso);
    const e = posicionNisar(fecha);
    if (!e) {
      muestras.push({ ve: false, sx: 0, sy: 0 });
      continue;
    }
    aVector(e.pos, q).applyAxisAngle(EJE_Y, -giroTierra(fecha));
    rel.subVectors(q, cam);
    const prof = -rel.dot(m);
    if (prof <= 0) {
      muestras.push({ ve: false, sx: 0, sy: 0 });
      continue;
    }
    // Coordenadas en pantalla, en "medias alturas" del cuadro (1 = borde de arriba).
    const sx = rel.dot(derecha) / (prof * tanMedio);
    const sy = rel.dot(arriba) / (prof * tanMedio);
    const lejosDelChaco = q.clone().normalize().angleTo(sm) > 0.3;
    muestras.push({ ve: lejosDelChaco && !tapadoPorTierra(cam, q), sx, sy });
  }

  // Dos criterios de encuadre: primero el ideal y, si no hay, uno más amplio.
  // Pantalla grande: el texto está a la izquierda, así que el ideal es la mitad derecha; sin pegarse
  // al borde de arriba, porque el reflector sobresale por encima del satélite.
  // Celular: el globo asoma abajo y el pie tapa su parte baja, así que cuenta la parte de arriba.
  // En pantalla grande, abajo a la derecha está el recuadro con los datos de la órbita: se evita.
  const sobreRecuadro = (sx: number, sy: number) => sx > 0.15 && sy < -0.15;
  const ideal = celular
    ? (sx: number, sy: number) => Math.abs(sx) < 0.5 && sy > 0.2 && sy < 0.65
    : (sx: number, sy: number) =>
        sx > -0.35 && sx < 0.6 * Math.max(1, aspecto) && sy > -0.45 && sy < 0.55 && !sobreRecuadro(sx, sy);
  const amplio = celular
    ? (sx: number, sy: number) => Math.abs(sx) < 0.55 && sy > 0.15 && sy < 0.85
    : (sx: number, sy: number) =>
        Math.abs(sx) < 0.65 * Math.max(1, aspecto) && sy > -0.75 && sy < 0.62 && !sobreRecuadro(sx, sy);

  const minimo = Math.round(N * 0.18); // ~9 s reales a la vista con el tiempo acelerado
  const adentro = Math.max(2, Math.round(N * 0.015));
  for (const enCuadro of [ideal, amplio]) {
    const ve = muestras.map((x) => x.ve && enCuadro(x.sx, x.sy));
    // Cuántas muestras seguidas a la vista quedan desde cada instante.
    const tramo = new Array<number>(total).fill(0);
    for (let i = total - 1; i >= 0; i--) tramo[i] = ve[i] ? 1 + (i + 1 < total ? tramo[i + 1] : 0) : 0;
    let inicioTramo = 0;
    for (let i = 0; i < total; i++) {
      if (!ve[i]) continue;
      if (i === 0 || !ve[i - 1]) inicioTramo = i;
      // Unas muestras adentro del tramo, para que no arranque justo entrando al encuadre.
      if (i - inicioTramo >= adentro && tramo[i] >= minimo) return ahoraMs + i * paso;
    }
    if (enCuadro === amplio) {
      let mejor = -1;
      for (let i = 0; i < total; i++) if (tramo[i] > (mejor < 0 ? 0 : tramo[mejor])) mejor = i;
      if (mejor >= 0) return ahoraMs + mejor * paso;
    }
  }
  return ahoraMs;
}

function texturaBrillo(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(190,225,255,0.55)");
  g.addColorStop(0.3, "rgba(124,196,255,0.28)");
  g.addColorStop(0.65, "rgba(124,196,255,0.08)");
  g.addColorStop(1, "rgba(124,196,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

type Control = { arrancar: () => void; frenar: () => void; dibujarQuieto: () => void };

export default function Globo({ activo, menos }: { activo: boolean; menos: boolean }) {
  const contRef = useRef<HTMLDivElement>(null);
  const chacoRef = useRef<HTMLDivElement>(null);
  const satRef = useRef<HTMLDivElement>(null);
  const altRef = useRef<HTMLSpanElement>(null);
  const velRef = useRef<HTMLSpanElement>(null);
  const sobreRef = useRef<HTMLSpanElement>(null);
  const control = useRef<Control | null>(null);
  const estado = useRef({ activo, menos });
  const [listo, setListo] = useState(false);
  const [sinWebgl, setSinWebgl] = useState(false);

  useEffect(() => {
    const cont = contRef.current;
    if (!cont) return;

    // Celular y tablet: tope de 1,5 en la densidad de píxeles. El suavizado de bordes solo hace falta con
    // densidad 1 (con más densidad los bordes ya se ven finos y el suavizado cuesta mucho en el celular).
    const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < ANCHO_LG ? 1.5 : 2);
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: dpr <= 1, alpha: true, powerPreference: "default" });
    } catch {
      setSinWebgl(true);
      return;
    }
    let vivo = true;
    renderer.setPixelRatio(dpr);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    cont.prepend(canvas);

    const escena = new THREE.Scene();
    const camara = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
    escena.add(camara);

    // Luces atadas a la cámara: el lado que mira la persona siempre se ve (no es la luz real del Sol).
    escena.add(new THREE.AmbientLight(0x9db8e8, 0.55));
    const luz = new THREE.DirectionalLight(0xffffff, 2.4);
    luz.position.set(-2.2, 1.6, 1.2);
    camara.add(luz);
    const contraluz = new THREE.DirectionalLight(0x7cc4ff, 1.1);
    contraluz.position.set(2.5, -0.6, -2.5);
    camara.add(contraluz);

    // Tierra (gira con la hora sideral, así la órbita queda en su lugar real).
    const tierra = new THREE.Group();
    escena.add(tierra);
    const matTierra = new THREE.MeshPhongMaterial({
      color: 0x0d2340,
      specular: new THREE.Color(0x1b2b3d),
      shininess: 7,
    });
    const esfera = new THREE.Mesh(new THREE.SphereGeometry(1, 72, 48), matTierra);
    tierra.add(esfera);

    const cargador = new THREE.TextureLoader();
    let texTierra: THREE.Texture | null = null;
    cargador.load("/globo/tierra-blue-marble-2048.webp", (tex) => {
      if (!vivo) {
        tex.dispose();
        return;
      }
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      texTierra = tex;
      matTierra.map = tex;
      matTierra.color.set(0xe4ebf3);
      matTierra.needsUpdate = true;
      setListo(true);
      dibujar(0);
    }, undefined, () => {
      // Sin textura igual se muestra el globo (azul liso) con la órbita.
      if (!vivo) return;
      setListo(true);
      dibujar(0);
    });

    const uniformesHalo = { uColor: { value: ACENTO.clone() }, uFuerza: { value: 0.85 } };
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(1.09, 64, 32),
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG_HALO,
        uniforms: uniformesHalo,
        side: THREE.BackSide,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    escena.add(halo);
    const borde = new THREE.Mesh(
      new THREE.SphereGeometry(1.003, 64, 32),
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG_BORDE,
        uniforms: { uColor: { value: ACENTO.clone() }, uFuerza: { value: 0.75 } },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    escena.add(borde);

    // Punto que late en General San Martín, Chaco.
    const marca = new THREE.Group();
    const pMarca = latLonAEscena(SAN_MARTIN.lat, SAN_MARTIN.lon, 1.004);
    marca.position.set(pMarca.x, pMarca.y, pMarca.z);
    marca.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), marca.position.clone().normalize());
    tierra.add(marca);
    const punto = new THREE.Mesh(
      new THREE.CircleGeometry(0.011, 24),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false }),
    );
    marca.add(punto);
    const anillos = [0, 1].map(() => {
      const m = new THREE.Mesh(
        new THREE.RingGeometry(0.014, 0.019, 48),
        new THREE.MeshBasicMaterial({ color: ACENTO, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
      );
      marca.add(m);
      return m;
    });

    // NISAR armado como en las imágenes oficiales de NASA/JPL (no hay modelo 3D oficial publicado):
    // el cuerpo dorado de ISRO, la estructura octogonal blanca del radar, dos alas solares de 3 paneles,
    // el brazo de 9 m con su codo y el gran reflector de malla dorada de 12 m, que es su marca.
    // Medidas en metros reales; ESCALA_M lo agranda muchísimo para que se vea (fuera de escala).
    // Con lookAt, +Z mira a la Tierra; el reflector queda del lado del espacio (-Z).
    const sat = new THREE.Group();
    escena.add(sat);
    const modelo = new THREE.Group();
    sat.add(modelo);
    const matOro = new THREE.MeshStandardMaterial({
      color: 0xd8ad45,
      metalness: 0.75,
      roughness: 0.32,
      emissive: new THREE.Color(0x3d2c06),
    });
    const matBlanco = new THREE.MeshStandardMaterial({
      color: 0xe6e9ee,
      metalness: 0.2,
      roughness: 0.5,
      emissive: new THREE.Color(0x262b33),
    });
    const matPanel = new THREE.MeshStandardMaterial({
      color: 0x1d3566,
      metalness: 0.35,
      roughness: 0.4,
      emissive: new THREE.Color(0x0b1a3a),
    });
    const matOscuro = new THREE.MeshStandardMaterial({
      color: 0x2b2f36,
      metalness: 0.5,
      roughness: 0.45,
      emissive: new THREE.Color(0x14171c),
    });
    const matMalla = new THREE.MeshStandardMaterial({
      color: 0xeedc9c,
      metalness: 0.35,
      roughness: 0.6,
      emissive: new THREE.Color(0x3a3014),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.88,
    });
    // Contorno claro (la grilla de los paneles y los bordes) para que se despegue del fondo oscuro.
    const matContorno = new THREE.LineBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.65 });
    function conContorno(geo: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh {
      const m = new THREE.Mesh(geo, mat);
      m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), matContorno));
      return m;
    }
    function barra(a: THREE.Vector3, b: THREE.Vector3, radio: number, mat: THREE.Material): THREE.Mesh {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(radio, radio, a.distanceTo(b), 8), mat);
      m.position.copy(a).add(b).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(EJE_Y, b.clone().sub(a).normalize());
      return m;
    }

    // Cuerpo de ISRO (caja con manta térmica dorada).
    modelo.add(conContorno(new THREE.BoxGeometry(1.8, 1.8, 2), matOro));
    // Estructura octogonal del radar (NASA), a lo largo de +X, con la bocina de alimentación arriba.
    const geoOcto = new THREE.CylinderGeometry(1.05, 1.05, 3.6, 8);
    geoOcto.rotateZ(Math.PI / 2);
    const octo = conContorno(geoOcto, matBlanco);
    octo.position.x = 0.9 + 1.8;
    modelo.add(octo);
    const posBocina = new THREE.Vector3(2.7, 0, -1.15);
    const bocina = conContorno(new THREE.BoxGeometry(2.6, 0.9, 0.35), matOscuro);
    bocina.position.copy(posBocina);
    modelo.add(bocina);
    // Dos alas solares, cada una de 3 paneles (5,5 m de largo), a los costados del cuerpo.
    const geoPanel = new THREE.BoxGeometry(1.9, 1.7, 0.06);
    for (const lado of [-1, 1]) {
      const ala = new THREE.Group();
      ala.position.y = lado * 0.9;
      ala.rotation.y = 0.5; // inclinadas, como en las imágenes
      modelo.add(ala);
      ala.add(barra(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, lado * 1.0, 0), 0.07, matOscuro));
      for (let k = 0; k < 3; k++) {
        const panel = conContorno(geoPanel, matPanel);
        panel.position.y = lado * (1.0 + 0.85 + k * 1.78);
        ala.add(panel);
      }
    }
    // Brazo de 9 m con un codo, desde la punta de la estructura del radar hasta el reflector.
    const pieBrazo = new THREE.Vector3(4.2, 0, -1.0);
    const codo = new THREE.Vector3(1.4, 0, -4.6);
    const puntaBrazo = new THREE.Vector3(-2.2, 0, -8.2);
    modelo.add(barra(pieBrazo, codo, 0.16, matOscuro));
    modelo.add(barra(codo, puntaBrazo, 0.16, matOscuro));
    const geoArticulacion = new THREE.SphereGeometry(0.3, 10, 8);
    for (const p of [pieBrazo, codo, puntaBrazo]) {
      const j = new THREE.Mesh(geoArticulacion, matBlanco);
      j.position.copy(p);
      modelo.add(j);
    }

    // Reflector de malla dorada de 12 m: casquete poco profundo (abre hacia +Z) con costillas y aro.
    const RADIO_REFLECTOR = 6;
    const CURVA = 0.42;
    const radioCasquete = RADIO_REFLECTOR / Math.sin(CURVA);
    const profundidad = radioCasquete * (1 - Math.cos(CURVA));
    const geoPlato = new THREE.SphereGeometry(radioCasquete, 48, 8, 0, Math.PI * 2, 0, CURVA);
    geoPlato.translate(0, -radioCasquete, 0);
    geoPlato.rotateX(-Math.PI / 2);
    const reflector = new THREE.Group();
    reflector.add(new THREE.Mesh(geoPlato, matMalla));
    // Costillas radiales y anillos de la malla, apenas por delante de la superficie del casquete.
    const puntosMalla: number[] = [];
    const sobrePlato = (r: number, ang: number): number[] => {
      const z = radioCasquete - Math.sqrt(radioCasquete * radioCasquete - r * r) + 0.03;
      return [r * Math.cos(ang), r * Math.sin(ang), z];
    };
    const COSTILLAS = 18;
    for (let i = 0; i < COSTILLAS; i++) {
      const ang = (i / COSTILLAS) * Math.PI * 2;
      for (let k = 0; k < 6; k++) {
        puntosMalla.push(
          ...sobrePlato((k / 6) * RADIO_REFLECTOR, ang),
          ...sobrePlato(((k + 1) / 6) * RADIO_REFLECTOR, ang),
        );
      }
    }
    for (const r of [2, 4]) {
      for (let i = 0; i < 48; i++) {
        puntosMalla.push(...sobrePlato(r, (i / 48) * Math.PI * 2), ...sobrePlato(r, ((i + 1) / 48) * Math.PI * 2));
      }
    }
    const geoMalla = new THREE.BufferGeometry();
    geoMalla.setAttribute("position", new THREE.Float32BufferAttribute(puntosMalla, 3));
    reflector.add(
      new THREE.LineSegments(geoMalla, new THREE.LineBasicMaterial({ color: 0x6f5f36, transparent: true, opacity: 0.8 })),
    );
    const aro = new THREE.Mesh(new THREE.TorusGeometry(RADIO_REFLECTOR, 0.12, 6, 72), matBlanco);
    aro.position.z = profundidad;
    reflector.add(aro);
    // El borde del reflector se apoya cerca de la punta del brazo y el plato mira a la bocina y a la Tierra.
    const centroReflector = new THREE.Vector3(-1.8, 0, -11.2);
    reflector.position.copy(centroReflector);
    reflector.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      posBocina.clone().sub(centroReflector).normalize(),
    );
    modelo.add(reflector);

    // Brillo suave alrededor, centrado en el conjunto (cuerpo + reflector).
    const CENTRO_M = new THREE.Vector3(0.6, 0, -5.2);
    const centroVisual = new THREE.Vector3();
    const texBrillo = texturaBrillo();
    const brillo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texBrillo,
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    sat.add(brillo);
    let escala = ESCALA_M;
    function ponerEscala(e: number) {
      escala = e;
      modelo.scale.setScalar(e);
      centroVisual.copy(CENTRO_M).multiplyScalar(e);
      brillo.position.copy(centroVisual);
      brillo.scale.setScalar(0.62 * (e / ESCALA_M));
    }
    ponerEscala(window.innerWidth < ANCHO_LG ? ESCALA_M_CELULAR : ESCALA_M);

    // Línea de la órbita completa (tenue) y estela detrás del satélite (brillante, se desvanece).
    const geoOrbita = new THREE.BufferGeometry();
    const posOrbita = new Float32Array((PUNTOS_ORBITA + 1) * 3);
    geoOrbita.setAttribute("position", new THREE.BufferAttribute(posOrbita, 3));
    const orbita = new THREE.Line(
      geoOrbita,
      new THREE.LineBasicMaterial({ color: ACENTO, transparent: true, opacity: 0.22, depthWrite: false }),
    );
    escena.add(orbita);

    const geoEstela = new THREE.BufferGeometry();
    const posEstela = new Float32Array((PUNTOS_ESTELA + 1) * 3);
    const colEstela = new Float32Array((PUNTOS_ESTELA + 1) * 3);
    for (let i = 0; i <= PUNTOS_ESTELA; i++) {
      const k = Math.pow(i / PUNTOS_ESTELA, 1.6);
      colEstela[i * 3] = ACENTO.r * k;
      colEstela[i * 3 + 1] = ACENTO.g * k;
      colEstela[i * 3 + 2] = ACENTO.b * k;
    }
    geoEstela.setAttribute("position", new THREE.BufferAttribute(posEstela, 3));
    geoEstela.setAttribute("color", new THREE.BufferAttribute(colEstela, 3));
    const estela = new THREE.Line(
      geoEstela,
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    // La estela siempre está sobre la órbita: no hace falta recalcular su esfera envolvente en cada cuadro.
    estela.frustumCulled = false;
    escena.add(estela);

    // Tiempo de la escena: arranca cerca de "ahora", en un instante con NISAR a la vista, y corre
    // acelerado solo mientras se anima.
    const celularIni = window.innerWidth < ANCHO_LG;
    const inicio = elegirInicio(
      Date.now(),
      celularIni ? MIRA_INICIAL_CELULAR : MIRA_INICIAL,
      Math.max(1, cont.clientWidth) /
        Math.max(1, cont.clientHeight * (celularIni ? FRACCION_GLOBO_CELULAR : 1)),
      celularIni,
    );
    let simMs = inicio;
    let orbitaDesde = -Infinity;
    /** Instante (ms) del primer punto de posOrbita. La ventana arranca 0,3 vueltas atrás: cubre la estela. */
    let ventanaIni = 0;
    const VENTANA_MIN = PERIODO_MIN * 1.02;

    function rellenar(arr: Float32Array, desdeMs: number, minutos: number, n: number) {
      let ultimo: Vec3 | null = null;
      for (let i = 0; i <= n; i++) {
        const e = posicionNisar(new Date(desdeMs + (i / n) * minutos * 60_000));
        const p: Vec3 | null = e ? e.pos : ultimo;
        if (!p) continue;
        ultimo = p;
        arr[i * 3] = p.x;
        arr[i * 3 + 1] = p.y;
        arr[i * 3 + 2] = p.z;
      }
    }

    // Cámara: mira a Sudamérica en el instante inicial.
    tierra.rotation.y = giroTierra(new Date(simMs));
    tierra.updateMatrixWorld(true);
    const esfMira = (m: { lat: number; lon: number }) =>
      new THREE.Spherical().setFromVector3(
        aVector(latLonAEscena(m.lat, m.lon)).applyMatrix4(tierra.matrixWorld).normalize(),
      );
    const esfGrande = esfMira(MIRA_INICIAL);
    const esfCelular = esfMira(MIRA_INICIAL_CELULAR);
    let esfBase = window.innerWidth >= ANCHO_LG ? esfGrande : esfCelular;
    let distancia = 5;
    const parallax = { x: 0, y: 0, ax: 0, ay: 0 };
    // Giro hecho con la mano (se suma a la mira inicial) y su inercia.
    const mano = {
      theta: 0,
      phi: 0,
      vTheta: 0,
      vPhi: 0,
      id: -1,
      movio: false,
      conMouse: false,
      x: 0,
      y: 0,
      x0: 0,
      y0: 0,
      t: 0,
      soltado: -Infinity,
    };
    let radPorPx = 0.005;
    let autoFactor = 1;

    function ubicarCamara() {
      const s = new THREE.Spherical(
        distancia,
        THREE.MathUtils.clamp(esfBase.phi - parallax.y * 0.05 + mano.phi, 0.2, Math.PI - 0.2),
        esfBase.theta - parallax.x * 0.08 + mano.theta,
      );
      camara.position.setFromSpherical(s);
      camara.lookAt(0, 0, 0);
      camara.updateMatrixWorld();
    }

    let ancho = 1;
    let alto = 1;
    function ajustar() {
      ancho = Math.max(1, cont!.clientWidth);
      alto = Math.max(1, cont!.clientHeight);
      const celular = window.innerWidth < ANCHO_LG;
      esfBase = celular ? esfCelular : esfGrande;
      ponerEscala(celular ? ESCALA_M_CELULAR : ESCALA_M);
      renderer.setSize(ancho, alto, false);
      // El globo se encuadra en un cuadro de "altoGlobo" pegado abajo; lo que sobra arriba es cielo
      // para que NISAR entre entero. setViewOffset corre el encuadre sin cambiar el tamaño del globo.
      const altoGlobo = celular ? Math.max(1, alto * FRACCION_GLOBO_CELULAR) : alto;
      camara.aspect = ancho / altoGlobo;
      if (altoGlobo < alto) camara.setViewOffset(ancho, altoGlobo, 0, -(alto - altoGlobo), ancho, alto);
      else camara.clearViewOffset();
      const tanMedio = Math.tan(THREE.MathUtils.degToRad(camara.fov / 2));
      distancia = MARGEN_ENCUADRE / (tanMedio * Math.min(1, camara.aspect)) + 0.4;
      // Radianes por píxel para que la superficie del centro siga al dedo.
      radPorPx = (2 * tanMedio * (distancia - 1)) / altoGlobo;
      camara.updateProjectionMatrix();
      bordeVisible = Math.min(ancho, window.innerWidth - cont!.getBoundingClientRect().left);
      ubicarCamara();
    }

    const vTmp = new THREE.Vector3();
    const vTmp2 = new THREE.Vector3();
    const vDer = new THREE.Vector3();
    const vCentro = new THREE.Vector3();
    let ultimoHud = 0;

    function aPantalla(mundo: THREE.Vector3, salida: { x: number; y: number }) {
      vTmp2.copy(mundo).project(camara);
      salida.x = ((vTmp2.x + 1) / 2) * ancho;
      salida.y = ((1 - vTmp2.y) / 2) * alto;
    }
    const pA = { x: 0, y: 0 };
    const pB = { x: 0, y: 0 };

    // Borde derecho que de verdad se ve: en pantallas grandes el globo se sale un poco de la ventana.
    let bordeVisible = 1;
    const ANCHO_ETIQUETA = 190; // px, alcanza para "General San Martín, Chaco"

    /** Ubica una etiqueta; si a la derecha no entra, la pasa al otro lado del punto. */
    function ponerEtiqueta(el: HTMLDivElement | null, x: number, y: number, opacidad: number, izquierda = false) {
      if (!el) return;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      el.style.opacity = opacidad.toFixed(2);
      if (izquierda) el.dataset.lado = "izq";
      else delete el.dataset.lado;
    }

    /** Estela interpolada sobre la órbita ya muestreada: cero propagaciones SGP4 por cuadro. */
    function estelaDesdeOrbita() {
      const escalaVentana = PUNTOS_ORBITA / (VENTANA_MIN * 60_000);
      const desde = simMs - ESTELA_MIN * 60_000;
      for (let i = 0; i <= PUNTOS_ESTELA; i++) {
        const ms = desde + (i / PUNTOS_ESTELA) * ESTELA_MIN * 60_000;
        const f = THREE.MathUtils.clamp((ms - ventanaIni) * escalaVentana, 0, PUNTOS_ORBITA);
        const j = Math.min(PUNTOS_ORBITA - 1, Math.floor(f));
        const k = f - j;
        for (let c = 0; c < 3; c++) {
          posEstela[i * 3 + c] = posOrbita[j * 3 + c] * (1 - k) + posOrbita[(j + 1) * 3 + c] * k;
        }
      }
    }

    function dibujar(ahoraReal: number) {
      const quieto = estado.current.menos;
      const fecha = new Date(simMs);
      tierra.rotation.y = giroTierra(fecha);

      // La órbita se propaga cada media vuelta (o si el tiempo volvió atrás, en el modo quieto).
      if (simMs - orbitaDesde > PERIODO_MIN * 60_000 * 0.5 || simMs < orbitaDesde) {
        orbitaDesde = simMs;
        ventanaIni = simMs - PERIODO_MIN * 60_000 * 0.3;
        rellenar(posOrbita, ventanaIni, VENTANA_MIN, PUNTOS_ORBITA);
        geoOrbita.attributes.position.needsUpdate = true;
        geoOrbita.computeBoundingSphere();
      }
      estelaDesdeOrbita();
      geoEstela.attributes.position.needsUpdate = true;

      const e = posicionNisar(fecha);
      if (e) {
        aVector(e.pos, sat.position);
        // "Arriba" del modelo = normal de la órbita (posición × velocidad). Con el Y del mundo, cerca de
        // los polos el satélite daba media vuelta sobre su eje de golpe.
        const despues = posicionNisar(new Date(simMs + 1000));
        if (despues) {
          vTmp.set(despues.pos.x - e.pos.x, despues.pos.y - e.pos.y, despues.pos.z - e.pos.z);
          sat.up.crossVectors(sat.position, vTmp).normalize();
        }
        sat.lookAt(0, 0, 0);
      }
      sat.visible = !!e;

      // Latido del punto (con menos movimiento queda quieto).
      anillos.forEach((m, i) => {
        const mat = m.material as THREE.MeshBasicMaterial;
        if (quieto) {
          m.scale.setScalar(1.8);
          mat.opacity = i === 0 ? 0.6 : 0;
          return;
        }
        const fase = ((ahoraReal / 2400 + i * 0.5) % 1 + 1) % 1;
        m.scale.setScalar(1 + fase * 2.6);
        mat.opacity = 0.9 * Math.pow(1 - fase, 1.5);
      });

      ubicarCamara();
      tierra.updateMatrixWorld(true);

      // Etiquetas HTML encima del canvas.
      marca.getWorldPosition(vTmp);
      const normal = vTmp.clone().normalize();
      const haciaCam = camara.position.clone().sub(vTmp).normalize();
      const frente = normal.dot(haciaCam);
      aPantalla(vTmp, pA);
      ponerEtiqueta(
        chacoRef.current,
        pA.x,
        pA.y,
        THREE.MathUtils.smoothstep(frente, 0.08, 0.3),
        pA.x + ANCHO_ETIQUETA > bordeVisible,
      );
      if (e) {
        // "NISAR" al costado del modelo: se corre lo que mide medio satélite en pantalla, desde el
        // centro del conjunto (el reflector queda lejos del cuerpo).
        sat.localToWorld(vCentro.copy(centroVisual));
        aPantalla(vCentro, pA);
        vDer.setFromMatrixColumn(camara.matrixWorld, 0).multiplyScalar(RADIO_SAT_M * escala).add(vCentro);
        aPantalla(vDer, pB);
        const medio = Math.hypot(pB.x - pA.x, pB.y - pA.y) + 6;
        const izq = pA.x + medio + 80 > bordeVisible;
        ponerEtiqueta(
          satRef.current,
          izq ? pA.x - medio : pA.x + medio,
          pA.y,
          tapadoPorTierra(camara.position, sat.position) ? 0 : 1,
          izq,
        );
      } else if (satRef.current) {
        satRef.current.style.opacity = "0";
      }

      if (e && (quieto || ahoraReal - ultimoHud > 250)) {
        ultimoHud = ahoraReal;
        if (altRef.current) altRef.current.textContent = `${fmt0.format(e.alturaKm)} ${t.unidades.km}`;
        if (velRef.current) velRef.current.textContent = `${fmt1.format(e.velocidadKmS)} ${t.unidades.kmS}`;
        if (sobreRef.current) sobreRef.current.textContent = textoLatLon(e.lat, e.lon);
      }

      renderer.render(escena, camara);
    }

    let raf = 0;
    let previo = 0;
    /** true mientras el navegador tiene el contexto WebGL perdido. */
    let sinContexto = false;
    // Si el equipo no llega a dibujar fluido: primero baja la resolución y, si sigue lento, dibuja
    // unos 15 cuadros por segundo para dejar libre el resto de la página.
    let saltear = false;
    let ultimoDibujo = 0;
    const regulador = crearRegulador((nivel) => {
      if (nivel === 1) {
        renderer.setPixelRatio(Math.min(dpr, 1) * 0.75);
        ajustar();
      } else saltear = true;
    });

    function cuadro(ahora: number) {
      raf = requestAnimationFrame(cuadro);
      if (saltear && ahora - ultimoDibujo < 66) return;
      ultimoDibujo = ahora;
      regulador.medir(previo ? ahora - previo : 0);
      const dt = previo ? Math.min(0.05, (ahora - previo) / 1000) : 0;
      previo = ahora;

      // El giro automático (tiempo acelerado) se frena mientras se arrastra y vuelve suave unos
      // segundos después de soltar.
      const arrastrando = mano.id !== -1 && mano.movio;
      const objetivo = arrastrando || ahora - mano.soltado < PAUSA_AUTO_MS ? 0 : 1;
      autoFactor += (objetivo - autoFactor) * Math.min(1, dt * (objetivo ? 1.2 : 8));
      simMs += dt * 1000 * ACELERACION * autoFactor;

      // Inercia después de soltar.
      if (!arrastrando && (mano.vTheta !== 0 || mano.vPhi !== 0)) {
        mano.theta += mano.vTheta * dt;
        const phi = mano.phi + mano.vPhi * dt;
        mano.phi = THREE.MathUtils.clamp(phi, -INCLINACION_MAX, INCLINACION_MAX);
        if (mano.phi !== phi) mano.vPhi = 0;
        const freno = Math.exp(-dt * INERCIA_FRENO);
        mano.vTheta *= freno;
        mano.vPhi *= freno;
        if (Math.abs(mano.vTheta) < 0.004) mano.vTheta = 0;
        if (Math.abs(mano.vPhi) < 0.004) mano.vPhi = 0;
      }

      parallax.x += (parallax.ax - parallax.x) * Math.min(1, dt * 3);
      parallax.y += (parallax.ay - parallax.y) * Math.min(1, dt * 3);
      dibujar(ahora);
    }

    // Un cuadro suelto cuando la animación está parada (movimiento reducido o fuera de pantalla).
    let pedido = 0;
    function pedirDibujo() {
      if (raf || pedido) return;
      pedido = requestAnimationFrame((ahora) => {
        pedido = 0;
        dibujar(ahora);
      });
    }

    control.current = {
      arrancar() {
        if (raf || sinContexto) return;
        previo = 0;
        regulador.reiniciar();
        raf = requestAnimationFrame(cuadro);
      },
      frenar() {
        cancelAnimationFrame(raf);
        raf = 0;
      },
      dibujarQuieto() {
        if (sinContexto) return;
        simMs = inicio;
        parallax.x = parallax.y = parallax.ax = parallax.ay = 0;
        mano.vTheta = mano.vPhi = 0;
        dibujar(performance.now());
      },
    };

    const ro = new ResizeObserver(() => {
      ajustar();
      if (!raf) dibujar(performance.now());
    });
    ro.observe(cont);
    ajustar();

    const punteroFino = window.matchMedia("(pointer: fine)").matches;
    function alMover(ev: PointerEvent) {
      if (estado.current.menos) return;
      const ax = (ev.clientX / window.innerWidth) * 2 - 1;
      const ay = (ev.clientY / window.innerHeight) * 2 - 1;
      if (mano.id !== -1) {
        // Mientras se arrastra, el parallax sigue al cursor pero se compensa en el giro a mano, así la
        // cámara no se mueve por esto y no queda un salto pendiente para después de soltar.
        mano.theta += (ax - parallax.x) * 0.08;
        mano.phi += (ay - parallax.y) * 0.05;
        parallax.x = ax;
        parallax.y = ay;
      }
      parallax.ax = ax;
      parallax.ay = ay;
    }
    if (punteroFino) window.addEventListener("pointermove", alMover, { passive: true });

    // Si la ventana cambia de ancho sin que cambie el contenedor, el borde visible igual cambia.
    function alCambiarVentana() {
      bordeVisible = Math.min(ancho, window.innerWidth - cont!.getBoundingClientRect().left);
    }
    window.addEventListener("resize", alCambiarVentana, { passive: true });

    // Girar con la mano. touch-action: pan-y deja al navegador el arrastre vertical del dedo (sigue
    // bajando la página y avisa con pointercancel); el horizontal llega acá y gira el globo.
    // pinch-zoom deja que la página se pueda agrandar con dos dedos (el globo no tiene zoom propio:
    // no hay listeners de rueda ni de dos dedos).
    canvas.style.touchAction = "pan-y pinch-zoom";
    const CURSOR_LIBRE = punteroFino ? "grab" : "";
    canvas.style.cursor = CURSOR_LIBRE;
    const UMBRAL_DEDO = 8; // px horizontales antes de girar con el dedo (por si es un scroll)

    function alApoyar(ev: PointerEvent) {
      if (mano.id !== -1 || !ev.isPrimary) return;
      if (ev.pointerType === "mouse" && ev.button !== 0) return;
      mano.id = ev.pointerId;
      mano.movio = false;
      mano.conMouse = ev.pointerType !== "touch";
      mano.x = mano.x0 = ev.clientX;
      mano.y = mano.y0 = ev.clientY;
      mano.t = ev.timeStamp;
      mano.vTheta = mano.vPhi = 0;
      if (mano.conMouse) {
        ev.preventDefault(); // que no seleccione texto
        if (punteroFino) canvas.style.cursor = "grabbing";
        try {
          canvas.setPointerCapture(ev.pointerId);
        } catch {
          // Sin captura igual funciona mientras el puntero siga sobre el globo.
        }
      }
    }

    function alArrastrar(ev: PointerEvent) {
      if (ev.pointerId !== mano.id) return;
      // Con el dedo, no gira hasta que el gesto es claramente horizontal: un scroll vertical apenas
      // torcido no mueve el globo ni frena el giro automático.
      if (!mano.conMouse && !mano.movio) {
        const tx = ev.clientX - mano.x0;
        const ty = ev.clientY - mano.y0;
        if (Math.abs(tx) < UMBRAL_DEDO || Math.abs(tx) <= Math.abs(ty)) return;
        mano.x = ev.clientX;
        mano.t = ev.timeStamp;
        mano.movio = true;
        return;
      }
      const dx = ev.clientX - mano.x;
      const dy = mano.conMouse ? ev.clientY - mano.y : 0;
      if (dx === 0 && dy === 0) return;
      const dt = Math.max(8, ev.timeStamp - mano.t) / 1000;
      mano.x = ev.clientX;
      mano.y = ev.clientY;
      mano.t = ev.timeStamp;
      mano.movio = true;

      // Arrastrar a la derecha lleva la superficie a la derecha: la cámara va para el otro lado.
      const dTheta = -dx * radPorPx;
      const phiAntes = mano.phi;
      mano.theta += dTheta;
      mano.phi = THREE.MathUtils.clamp(mano.phi - dy * radPorPx, -INCLINACION_MAX, INCLINACION_MAX);
      const dPhi = mano.phi - phiAntes;

      // Velocidad suavizada, para la inercia al soltar.
      mano.vTheta = mano.vTheta * 0.5 + (dTheta / dt) * 0.5;
      mano.vPhi = mano.vPhi * 0.5 + (dPhi / dt) * 0.5;
      pedirDibujo();
    }

    function alSoltar(ev: PointerEvent) {
      if (ev.pointerId !== mano.id) return;
      const conInercia =
        mano.movio && ev.type === "pointerup" && !estado.current.menos && ev.timeStamp - mano.t < 90;
      if (conInercia) {
        mano.vTheta = THREE.MathUtils.clamp(mano.vTheta, -INERCIA_MAX, INERCIA_MAX);
        mano.vPhi = THREE.MathUtils.clamp(mano.vPhi, -INERCIA_MAX, INERCIA_MAX);
      } else {
        mano.vTheta = mano.vPhi = 0;
      }
      if (mano.movio) mano.soltado = performance.now();
      mano.id = -1;
      mano.movio = false;
      canvas.style.cursor = CURSOR_LIBRE;
      try {
        if (canvas.hasPointerCapture(ev.pointerId)) canvas.releasePointerCapture(ev.pointerId);
      } catch {
        // Nada que soltar.
      }
    }

    canvas.addEventListener("pointerdown", alApoyar);
    canvas.addEventListener("pointermove", alArrastrar);
    canvas.addEventListener("pointerup", alSoltar);
    canvas.addEventListener("pointercancel", alSoltar);
    canvas.addEventListener("lostpointercapture", alSoltar);

    // Contexto WebGL perdido (volver de otra app, poca memoria): se frena el loop y se avisa.
    // three.js vuelve a subir texturas y geometrías solo al recuperarlo; acá se retoma el dibujo.
    function alPerderContexto(ev: Event) {
      ev.preventDefault();
      sinContexto = true;
      control.current?.frenar();
      cancelAnimationFrame(pedido);
      pedido = 0;
      setSinWebgl(true);
    }
    function alRecuperarContexto() {
      sinContexto = false;
      setSinWebgl(false);
      const { activo: a, menos: m } = estado.current;
      if (m) control.current?.dibujarQuieto();
      else if (a) control.current?.arrancar();
      else dibujar(performance.now());
    }
    canvas.addEventListener("webglcontextlost", alPerderContexto);
    canvas.addEventListener("webglcontextrestored", alRecuperarContexto);

    const { activo: a0, menos: m0 } = estado.current;
    if (m0) control.current.dibujarQuieto();
    else if (a0) control.current.arrancar();
    else dibujar(performance.now());

    return () => {
      vivo = false;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(pedido);
      raf = 0;
      pedido = 0;
      ro.disconnect();
      if (punteroFino) window.removeEventListener("pointermove", alMover);
      window.removeEventListener("resize", alCambiarVentana);
      canvas.removeEventListener("pointerdown", alApoyar);
      canvas.removeEventListener("pointermove", alArrastrar);
      canvas.removeEventListener("pointerup", alSoltar);
      canvas.removeEventListener("pointercancel", alSoltar);
      canvas.removeEventListener("lostpointercapture", alSoltar);
      canvas.removeEventListener("webglcontextlost", alPerderContexto);
      canvas.removeEventListener("webglcontextrestored", alRecuperarContexto);
      control.current = null;
      escena.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
        for (const mat of mats) mat.dispose();
      });
      texTierra?.dispose();
      texBrillo.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, []);

  // Pausa fuera de pantalla y modo quieto con menos movimiento.
  useEffect(() => {
    estado.current = { activo, menos };
    const c = control.current;
    if (!c) return;
    if (menos) {
      c.frenar();
      c.dibujarQuieto();
    } else if (activo) c.arrancar();
    else c.frenar();
  }, [activo, menos]);

  return (
    <>
      <div
        ref={contRef}
        role="img"
        aria-label={t.globo.descripcion}
        className={`absolute inset-0 select-none transition-[opacity,scale] duration-[1000ms] ease-[cubic-bezier(0.23,1,0.32,1)] ${listo ? "opacity-100" : "opacity-0 motion-safe:scale-[0.96]"}`}
      >
        <div
          ref={chacoRef}
          aria-hidden
          className="group pointer-events-none absolute left-0 top-0 opacity-0 will-change-transform"
        >
          <span className="glass -mt-3 block translate-x-3 -translate-y-full transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none group-data-[lado=izq]:-translate-x-[calc(100%+0.75rem)] whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium text-ink">
            {t.globo.lugar}
          </span>
        </div>
        <div ref={satRef} aria-hidden className="group pointer-events-none absolute left-0 top-0 opacity-0 will-change-transform transition-opacity duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]">
          <span className="glass block -translate-y-1/2 group-data-[lado=izq]:-translate-x-full whitespace-nowrap rounded-full px-2.5 py-1 font-mono text-xs font-semibold tracking-[0.14em] text-accent">
            {t.globo.satelite}
          </span>
        </div>
      </div>

      {sinWebgl && (
        <p className="absolute inset-x-0 bottom-1/3 text-center text-sm text-ink-3">{t.globo.sinWebgl}</p>
      )}

      {/* Datos de la órbita calculada (no es telemetría en vivo). */}
      <div
        className={`glass absolute bottom-[22%] right-[7%] hidden w-64 rounded-2xl px-4 py-3.5 transition-[opacity,translate] duration-500 delay-500 ease-[cubic-bezier(0.23,1,0.32,1)] lg:block ${
          listo ? "opacity-100" : "opacity-0 motion-safe:translate-y-2"
        }`}
      >
        <p className="flex items-center gap-2 text-xs font-medium text-ink-2">
          <span aria-hidden className="size-1.5 rounded-full bg-accent shadow-[0_0_10px_2px_rgb(124_196_255/0.7)]" />
          {t.hud.titulo}
        </p>
        <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs">
          <dt className="text-ink-3">{t.hud.altura}</dt>
          <dd className="text-right text-ink tabular-nums">
            <span ref={altRef}>{t.globo.cargando}</span>
          </dd>
          <dt className="text-ink-3">{t.hud.velocidad}</dt>
          <dd className="text-right text-ink tabular-nums">
            <span ref={velRef}>{t.globo.cargando}</span>
          </dd>
          <dt className="text-ink-3">{t.hud.sobre}</dt>
          <dd className="text-right text-ink tabular-nums">
            <span ref={sobreRef}>{t.globo.cargando}</span>
          </dd>
        </dl>
        <p className="mt-2.5 border-t border-line pt-2 text-xs text-ink-3">{menos ? t.hud.quieto : t.hud.acelerado}</p>
      </div>
    </>
  );
}
