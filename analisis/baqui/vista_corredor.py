"""Imagen antes/después del corredor Resistencia - General San Martín (NISAR 161A, 29/9 y 11/10)."""
import numpy as np
import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
from pyproj import Transformer
from scipy.ndimage import median_filter

def db(v): return 10 * np.log10(np.where(v > 0, v, np.nan))
a = np.load("datos/nisar/20260929_161A164_corredor.npz"); b = np.load("datos/nisar/20261011_161A164_corredor.npz")
s = 4  # 1 de cada 4 píxeles: 80 m, alcanza para ver
h0 = db(a["HHHH"][::s, ::s].astype("float64")); h1 = db(b["HHHH"][::s, ::s].astype("float64"))
d = median_filter(h1 - h0, 3)
x, y = a["x"][::s], a["y"][::s]; ext = [x[0], x[-1], y[-1], y[0]]
tr = Transformer.from_crs(4326, int(a["epsg"]), always_xy=True)
pueblos = {"Resistencia": (-58.98, -27.45), "Gral. San Martín": (-59.34, -26.54)}
print("agua (<-18 dB) antes %.2f %% después %.2f %% | cambio mediano %.2f dB | %% área que subió >1 dB: %.0f"
      % (100 * np.nanmean(h0 < -18), 100 * np.nanmean(h1 < -18), np.nanmedian(d), 100 * np.nanmean(d > 1)))
fig, ax = plt.subplots(1, 3, figsize=(14, 7.5))
for k, (im, t) in enumerate([(h0, "29/9/2026 (antes)"), (h1, "11/10/2026 (2 días después)")]):
    ax[k].imshow(im, cmap="gray", vmin=-22, vmax=0, extent=ext); ax[k].set_title("NISAR HH " + t)
c = ax[2].imshow(d, cmap="RdBu", vmin=-4, vmax=4, extent=ext); ax[2].set_title("Cambio del eco (dB): azul = se mojó")
for q in ax:
    for n, (lo, la) in pueblos.items():
        px, py = tr.transform(lo, la); q.plot(px, py, "o", color="yellow", mec="k"); q.annotate(n, (px, py), xytext=(5, 5), textcoords="offset points", color="yellow", fontsize=9, weight="bold")
    q.set_xticks([]); q.set_yticks([])
fig.colorbar(c, ax=ax[2], fraction=0.046)
fig.suptitle("Baqui · corredor Resistencia – General San Martín (~95 × 150 km) · NISAR órbita 161, misma pasada")
plt.tight_layout(); plt.savefig("datos/nisar/antes_despues_corredor.png", dpi=100); print("ok")
