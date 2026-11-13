// Piezas de ejemplo para el editor (fase 2). Coordenadas del hueso:
//   cabeza: centro de la cara en (0, 0); la cara va de −78 a +78 en y, ±58 en x; lo alto del pelo en y ≈ −90.
//   pecho / cintura: el punto del pecho o de la cintura en (0, 0), sobre la superficie de delante.
//   manoIzq / manoDer: la muñeca en (0, 0); x positivo va hacia los dedos (la palma está en x ≈ 12).
// {piel}, {ropa}, {ropaS}, {ropaL}, {pelo}, {cinto}… se sustituyen por los colores del personaje.
window.BIBLIOTECA = [
  { nombre: "Turbante", hueso: "cabeza", modo: "silueta", capa: "delante", vista: "siempre", grupo: "sombrero", x: 0, y: 0, escala: 1, rot: 0,
    svg: `<path d="M-68 -30 C -74 -84 -38 -112 0 -112 C 38 -112 74 -84 68 -30 C 44 -44 -44 -44 -68 -30 Z" fill="#e6d6b4"/>
<path d="M-68 -30 C -74 -84 -38 -112 0 -112 C -30 -96 -48 -70 -50 -40 C -58 -38 -64 -34 -68 -30 Z" fill="#c4ae86"/>
<path d="M-66 -46 C -30 -62 30 -62 66 -46" stroke="#b8402e" stroke-width="9" fill="none" stroke-linecap="round"/>
<path d="M-30 -100 C -10 -90 20 -92 40 -100" stroke="#fff6e0" stroke-width="6" fill="none" stroke-linecap="round" opacity=".6"/>` },
  { nombre: "Velo", hueso: "cabeza", modo: "silueta", capa: "delante", vista: "siempre", grupo: "sombrero", oculta: ["melena"], x: 0, y: 0, escala: 1, rot: 0,
    svg: `<path d="M-76 170 C -86 60 -82 -40 -66 -66 C -48 -96 48 -96 66 -66 C 82 -40 86 60 76 170 L 54 170 C 62 60 60 -10 52 -40 C 30 -62 -30 -62 -52 -40 C -60 -10 -62 60 -54 170 Z" fill="{ropaL}"/>
<path d="M-76 170 C -86 60 -82 -40 -66 -66 C -58 -80 -44 -88 -30 -92 C -54 -70 -64 -20 -62 170 Z" fill="{ropa}" opacity=".35"/>`,
    // de perfil (mirando a la derecha): la tela cubre la nuca y la abertura queda delante, junto a la mejilla
    svgPerfil: `<path d="M46 -70 C 20 -100 -52 -100 -72 -58 C -88 -16 -86 70 -80 170 Q -22 188 36 170 C 30 120 26 70 22 30 C 18 -10 24 -46 46 -70 Z" fill="{ropaL}"/>
<path d="M-72 -58 C -88 -16 -86 70 -80 170 L -60 170 C -66 80 -66 0 -54 -50 C -46 -74 -30 -88 -14 -94 C -42 -92 -62 -78 -72 -58 Z" fill="{ropa}" opacity=".35"/>
<path d="M46 -70 C 24 -46 18 -10 22 30" stroke="{ropa}" stroke-width="4" fill="none" opacity=".3"/>`,
    // de espaldas: cubre toda la cabeza
    svgEspaldas: `<path d="M-70 -56 C -52 -100 52 -100 70 -56 C 84 -20 88 60 78 170 Q 0 192 -78 170 C -88 60 -84 -20 -70 -56 Z" fill="{ropaL}"/>
<path d="M-70 -56 C -84 -20 -88 60 -78 170 L -56 170 C -64 80 -64 0 -54 -44 C -46 -74 -30 -90 -12 -96 C -42 -92 -62 -76 -70 -56 Z" fill="{ropa}" opacity=".35"/>
<path d="M-10 -40 C -16 30 -20 100 -24 170 M 22 -30 C 22 40 24 110 30 170" stroke="{ropa}" stroke-width="4" fill="none" opacity=".25"/>` },
  { nombre: "Gafas", hueso: "cabeza", modo: "superficie", capa: "delante", vista: "frente", grupo: "", x: 0, y: 4, escala: 1, rot: 0,
    svg: `<circle cx="-24" cy="0" r="17" fill="#cfe6ff" fill-opacity=".18" stroke="#1d1a26" stroke-width="5"/>
<circle cx="24" cy="0" r="17" fill="#cfe6ff" fill-opacity=".18" stroke="#1d1a26" stroke-width="5"/>
<path d="M-7 -2 Q 0 -7 7 -2" stroke="#1d1a26" stroke-width="5" fill="none"/>
<path d="M-31 -8 L -24 -12" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity=".7"/>` },
  { nombre: "Gorra", hueso: "cabeza", modo: "silueta", capa: "delante", vista: "siempre", grupo: "sombrero", x: 0, y: 0, escala: 1, rot: 0,
    svg: `<path d="M-64 -44 C -66 -92 -32 -110 0 -110 C 32 -110 66 -92 64 -44 Z" fill="{ropa}"/>
<path d="M-64 -44 C -66 -92 -32 -110 0 -110 C -26 -98 -40 -74 -42 -44 Z" fill="{ropaS}"/>
<path d="M-6 -46 C 30 -54 74 -50 96 -40 C 92 -32 70 -30 -6 -36 Z" fill="{ropaS}"/>
<circle cx="0" cy="-110" r="6" fill="{ropaL}"/>` },
  { nombre: "Colgante", hueso: "pecho", capa: "delante", vista: "frente", grupo: "", x: 0, y: -40, escala: 1, rot: 0,
    svg: `<path d="M-26 -30 Q 0 20 26 -30" stroke="#5a3a2a" stroke-width="3" fill="none"/>
<path d="M-4 0 L 4 0 L 4 10 L 12 10 L 12 18 L 4 18 L 4 34 L -4 34 L -4 18 L -12 18 L -12 10 L -4 10 Z" fill="#d8b060" stroke="#8a6a30" stroke-width="2"/>` },
  { nombre: "Zurrón", hueso: "cintura", capa: "delante", vista: "siempre", grupo: "", x: 46, y: 20, escala: 1, rot: 0,
    svg: `<path d="M-60 -150 L 10 -10" stroke="#6a4630" stroke-width="9" stroke-linecap="round"/>
<path d="M-6 -6 L 42 -6 C 48 -6 50 0 50 6 L 48 46 C 48 54 42 58 36 58 L 2 58 C -4 58 -10 54 -10 46 L -12 6 C -12 0 -10 -6 -6 -6 Z" fill="#8a5a3a"/>
<path d="M-12 6 C -12 -2 -6 -8 2 -8 L 40 -8 C 46 -8 50 -2 50 6 L 50 22 C 30 30 8 30 -12 22 Z" fill="#a8744a"/>
<circle cx="19" cy="22" r="4" fill="#e6c27a"/>` },
  { nombre: "Lámpara de aceite", hueso: "manoDer", capa: "delante", vista: "siempre", grupo: "en la mano", x: 14, y: -14, escala: 1, rot: -90,
    svg: `<path d="M-30 0 C -30 18 30 18 36 0 C 30 -8 -24 -8 -30 0 Z" fill="#b8784a"/>
<path d="M-30 0 C -30 18 30 18 36 0 C 10 8 -14 8 -30 0 Z" fill="#8a5232"/>
<ellipse cx="0" cy="-3" rx="10" ry="4" fill="#5a3422"/>
<path d="M34 -2 Q 40 -24 38 -34 Q 48 -20 42 -2 Z" fill="#ffd27a"/>
<circle cx="40" cy="-14" r="22" fill="#ffd27a" opacity=".22"/>` },
  { nombre: "Rollo", hueso: "manoIzq", capa: "delante", vista: "siempre", grupo: "en la mano", x: 14, y: 0, escala: 1, rot: 0,
    svg: `<rect x="-10" y="-46" width="20" height="92" rx="10" fill="#c9a06a"/>
<rect x="-5" y="-56" width="10" height="112" rx="5" fill="#8a5a3a"/>
<path d="M-8 -30 L 8 -30 M -8 -16 L 8 -16 M -8 -2 L 8 -2" stroke="#a87a4a" stroke-width="3"/>` },
  { nombre: "Brazalete", hueso: "antebrazoDer", capa: "delante", vista: "siempre", grupo: "", x: 50, y: 0, escala: 1, rot: 0,
    svg: `<rect x="-9" y="-15" width="18" height="30" rx="5" fill="#d8b060" stroke="#8a6a30" stroke-width="2"/><rect x="-2" y="-15" width="4" height="30" fill="#f4dc90" opacity=".7"/>` },
  { nombre: "Zapatos rojos", hueso: "pieIzq", capa: "delante", vista: "siempre", grupo: "", x: 0, y: 0, escala: 1, rot: 0,
    svg: `<ellipse cx="0" cy="10" rx="20" ry="11" fill="#b8302a"/><ellipse cx="-4" cy="6" rx="10" ry="4" fill="#e86a5a" opacity=".8"/>` },
];
