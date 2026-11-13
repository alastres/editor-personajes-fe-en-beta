"""Convierte una ilustración (p. ej. una referencia de Flow) en una LÁMINA VECTORIAL POR CAPAS para el editor de escenas.

Cada capa (lejos, medio, delante…) se define con un polígono aproximado en píxeles de la imagen; GrabCut ajusta el borde a la
silueta real del dibujo. Lo que queda tapado detrás de cada capa se rellena (inpaint) para que, al moverse la cámara con
paralaje, no se vean agujeros. Cada capa se vectoriza con vtracer (formas planas) y se recorta con su silueta.

Uso:  python comun/lamina-vectorizar.py <capas.json>
capas.json = { "imagen": "ruta.jpg", "nombre": "tumba-noche-1",
               "capas": [ { "id": "lejos" },                                  (la primera: la imagen entera, sin recorte)
                          { "id": "medio",   "poligono": [[x,y], …] },
                          { "id": "delante", "poligonos": [[[x,y], …], …] } ] }   (de atrás a delante)
Salida: shorts-flow/ilustraciones/<nombre>/<capa>.svg (viewBox en píxeles de la imagen) y se regenera ilustraciones/todas.js
"""
import json, os, re, sys
import cv2, numpy as np, vtracer

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ESC = 1   # con imágenes 2K de Flow no hace falta ampliar


def mascara_poligonos(h, w, polis):
    m = np.zeros((h, w), np.uint8)
    for p in polis: cv2.fillPoly(m, [np.array(p, np.int32)], 255)
    return m


def ajustar(im, aprox):
    """GrabCut con el polígono como guía: seguro dentro (erosionado), probable en la franja del borde, fondo fuera."""
    k = np.ones((max(9, aprox.shape[1] // 30),) * 2, np.uint8)
    dentro, fuera = cv2.erode(aprox, k), cv2.dilate(aprox, k)
    gc = np.full(aprox.shape, cv2.GC_BGD, np.uint8); gc[fuera > 0] = cv2.GC_PR_BGD; gc[aprox > 0] = cv2.GC_PR_FGD; gc[dentro > 0] = cv2.GC_FGD
    bg, fg = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(im, gc, None, bg, fg, 4, cv2.GC_INIT_WITH_MASK)
    m = np.where((gc == cv2.GC_FGD) | (gc == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8)); m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    return m


def silueta_svg(m):
    cs, _ = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    d = ""
    for c in cs:
        if cv2.contourArea(c) < 40: continue
        c = cv2.approxPolyDP(c, 1.2, True)
        d += "M" + " L ".join(f"{p[0][0]} {p[0][1]}" for p in c) + " Z "
    return d


def vectorizar(rgb, ruta_tmp):
    # alisado que conserva los bordes: aplana el ruido del JPG en zonas de color limpias (bordes nítidos, sin dientes)
    rgb = cv2.pyrMeanShiftFiltering(rgb, 5, 10)
    big = cv2.resize(rgb, None, fx=ESC, fy=ESC, interpolation=cv2.INTER_LANCZOS4) if ESC != 1 else rgb
    cv2.imwrite(ruta_tmp + ".png", big)
    vtracer.convert_image_to_svg_py(ruta_tmp + ".png", ruta_tmp + ".svg", colormode="color", hierarchical="stacked", mode="spline",
                                    filter_speckle=6, color_precision=7, layer_difference=8, corner_threshold=70,
                                    length_threshold=3.5, max_iterations=10, splice_threshold=50, path_precision=1)
    svg = open(ruta_tmp + ".svg", encoding="utf-8").read()
    cuerpo = svg[svg.index(">", svg.index("<svg")) + 1: svg.rindex("</svg>")]
    return f'<g transform="scale({1 / ESC})">{cuerpo}</g>'


def main():
    cfg = json.load(open(sys.argv[1], encoding="utf-8"))
    im = cv2.imread(cfg["imagen"]); h, w = im.shape[:2]
    dest = os.path.join(RAIZ, "ilustraciones", cfg["nombre"]); os.makedirs(dest, exist_ok=True)
    capas = cfg["capas"]; k = w / cfg.get("base", w)
    for c in capas:
        if "poligono" in c: c["poligono"] = [[x * k, y * k] for x, y in c["poligono"]]
        if "poligonos" in c: c["poligonos"] = [[[x * k, y * k] for x, y in pl] for pl in c["poligonos"]]
    mascaras = []
    for c in capas:
        polis = c.get("poligonos") or ([c["poligono"]] if "poligono" in c else None)
        mascaras.append(None if polis is None else ajustar(im, mascara_poligonos(h, w, polis)))
    for i, c in enumerate(capas):
        # lo que tapan las capas de delante se rellena con los colores de alrededor (sin agujeros al moverse)
        tapa = np.zeros((h, w), np.uint8)
        for m in mascaras[i + 1:]:
            if m is not None: tapa |= cv2.dilate(m, np.ones((9, 9), np.uint8))
        if tapa.any() and c.get("relleno") == "arriba":
            # cielo y lejanías: lo tapado se rellena continuando hacia abajo el color que hay encima (el degradado del cielo sigue)
            rgb = im.copy(); t = tapa > 0
            for y in range(1, h): fila = t[y]; rgb[y, fila] = rgb[y - 1, fila]
            suave = cv2.GaussianBlur(rgb, (41, 1), 0); rgb[t] = suave[t]
        else: rgb = cv2.inpaint(im, tapa, 12, cv2.INPAINT_TELEA) if tapa.any() else im.copy()
        cuerpo = vectorizar(rgb, os.path.join(dest, "_tmp_" + c["id"]))
        if mascaras[i] is not None:
            cid = f'lam-{cfg["nombre"]}-{c["id"]}'
            cuerpo = f'<defs><clipPath id="{cid}"><path d="{silueta_svg(cv2.dilate(mascaras[i], np.ones((3, 3), np.uint8)))}" clip-rule="evenodd"/></clipPath></defs><g clip-path="url(#{cid})">{cuerpo}</g>'
            cv2.imwrite(os.path.join(dest, f"_mascara_{c['id']}.png"), mascaras[i])
        # luces: resplandores suaves (degradado radial en modo pantalla) que la vectorización aplana; en píxeles de la imagen base
        luces = ""
        for j, L in enumerate(c.get("luces", [])):
            gid = f'lam-{cfg["nombre"]}-{c["id"]}-luz{j}'
            luces += (f'<defs><radialGradient id="{gid}"><stop offset="0" stop-color="{L["color"]}" stop-opacity="{L.get("op", 0.7)}"/>'
                      f'<stop offset="0.45" stop-color="{L["color"]}" stop-opacity="{L.get("op", 0.7) * 0.35:.3f}"/><stop offset="1" stop-color="{L["color"]}" stop-opacity="0"/></radialGradient></defs>'
                      f'<ellipse cx="{L["x"] * k:.1f}" cy="{L["y"] * k:.1f}" rx="{L["r"] * k:.1f}" ry="{L.get("ry", L["r"]) * k:.1f}" fill="url(#{gid})" style="mix-blend-mode:screen"/>')
        cuerpo += luces
        open(os.path.join(dest, c["id"] + ".svg"), "w", encoding="utf-8").write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}">{cuerpo}</svg>')
        for ext in (".png", ".svg"):
            try: os.remove(os.path.join(dest, "_tmp_" + c["id"] + ext))
            except OSError: pass
        print(c["id"], round(os.path.getsize(os.path.join(dest, c["id"] + ".svg")) / 1024), "KB")
    json.dump({"nombre": cfg["nombre"], "ancho": w, "alto": h, "capas": [c["id"] for c in capas], "origen": cfg["imagen"]},
              open(os.path.join(dest, "lamina.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    regenerar()


def regenerar():
    """ilustraciones/todas.js: window.LAMINAS = { nombre: { ancho, alto, capas: { id: "<contenido svg>" } } } (lo cargan el editor y el vídeo)."""
    base = os.path.join(RAIZ, "ilustraciones"); todo = {}
    for n in sorted(os.listdir(base)):
        f = os.path.join(base, n, "lamina.json")
        if not os.path.exists(f): continue
        L = json.load(open(f, encoding="utf-8")); capas = {}
        for c in L["capas"]:
            svg = open(os.path.join(base, n, c + ".svg"), encoding="utf-8").read()
            capas[c] = re.sub(r"^<svg[^>]*>|</svg>$", "", svg)
        todo[n] = {"ancho": L["ancho"], "alto": L["alto"], "capas": capas}
    open(os.path.join(base, "todas.js"), "w", encoding="utf-8").write("window.LAMINAS = " + json.dumps(todo, ensure_ascii=False) + ";\n")
    print("todas.js:", round(os.path.getsize(os.path.join(base, "todas.js")) / 1024), "KB")


if __name__ == "__main__":
    main()
