from pathlib import Path
import json, numpy as np
import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
from scipy.ndimage import median_filter
from pyproj import Transformer
from shapely.geometry import LineString
from rasterio.features import geometry_mask
from rasterio.transform import from_origin
a=np.load("datos/nisar/20260929_161A164.npz"); b=np.load("datos/nisar/20261011_161A164.npz")
db=lambda v: 10*np.log10(np.where(v>0,v,np.nan))
h0=median_filter(db(a["HHHH"]),3); h1=median_filter(db(b["HHHH"]),3)
v0=db(a["HVHV"]); v1=db(b["HVHV"])
agua0=h0<-18; agua1=h1<-18
print("HH mediana antes %.1f despues %.1f dB | HV antes %.1f despues %.1f"%(np.nanmedian(h0),np.nanmedian(h1),np.nanmedian(v0),np.nanmedian(v1)))
print("agua antes %.2f %% despues %.2f %% | agua nueva %.2f %%"%(100*np.nanmean(agua0),100*np.nanmean(agua1),100*np.nanmean(agua1&~agua0)))
d=h1-h0; print("dHH mediana %.2f dB; %% area con dHH>1 dB: %.0f"%(np.nanmedian(d),100*np.nanmean(d>1)))
x,y=a["x"],a["y"]; T=from_origin(x[0]-10,y[0]+10,20,20) if y[0]>y[-1] else None
epsg=int(a["epsg"]); tr=Transformer.from_crs(4326,epsg,always_xy=True)
rd=json.loads(Path("datos/osm/roads.json").read_text(encoding="utf-8"))
geo={e["id"]:e["geometry"] for e in rd["elements"] if e.get("type")=="way" and "geometry" in e}
for i in (746343006,118260612,1084701978):
    ln=LineString([tr.transform(p["lon"],p["lat"]) for p in geo[i]])
    m=~geometry_mask([ln.buffer(50)],out_shape=h0.shape,transform=T)
    print("camino",i,"dHH mediana %.2f dB, agua nueva %.1f %%, pix %d"%(np.nanmedian(d[m]),100*np.nanmean((agua1&~agua0)[m]),m.sum()))
fig,ax=plt.subplots(1,3,figsize=(15,5.4))
ext=[x[0],x[-1],y[-1],y[0]]
for k,(im,t) in enumerate([(h0,"29/9/2026 (antes)"),(h1,"11/10/2026 (2 días después)")]):
    ax[k].imshow(im,cmap="gray",vmin=-22,vmax=0,extent=ext); ax[k].set_title("NISAR HH (dB) "+t)
c=ax[2].imshow(median_filter(d,5),cmap="RdBu",vmin=-4,vmax=4,extent=ext); ax[2].set_title("Cambio del eco (dB): azul = subió")
for k,i in enumerate((746343006,118260612,1084701978)):
    xs,ys=zip(*[tr.transform(p["lon"],p["lat"]) for p in geo[i]])
    for q in ax: q.plot(xs,ys,color="yellow",lw=2)
    ax[2].annotate(str(k+1),(xs[0],ys[0]),color="black",fontsize=12,weight="bold")
for q in ax: q.set_xticks([]); q.set_yticks([])
fig.colorbar(c,ax=ax[2],fraction=0.046)
fig.suptitle("Baqui · NISAR órbita 161 · ~50 × 50 km alrededor de General San Martín (Chaco). Amarillo: caminos candidatos")
plt.tight_layout(); plt.savefig("datos/nisar/antes_despues_sanmartin.png",dpi=110)
print("ok imagen")
