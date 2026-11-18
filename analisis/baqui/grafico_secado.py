from pathlib import Path
import json, matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
f=json.loads(Path("datos/nisar/secado.json").read_text(encoding="utf-8"))
lluvia={0:59,1:1,2:3,3:1,12:2,13:2,14:3}
fig,ax=plt.subplots(figsize=(9,4.6)); ax2=ax.twinx()
ax2.bar(list(lluvia),list(lluvia.values()),color="#9ecae1",width=0.6,label="lluvia (mm, NASA POWER)"); ax2.set_ylabel("lluvia del día (mm)"); ax2.set_ylim(0,120)
for k,c in (("1","#d62728"),("2","#ff7f0e"),("3","#2ca02c")):
    ax.plot([r["dias"] for r in f],[r[k] for r in f],"o-",color=c,label=f"camino {k}")
ax.plot([r["dias"] for r in f],[r["zona"] for r in f],"s--",color="gray",label="zona (mediana)")
ax.axhline(0,color="k",lw=0.5); ax.set_zorder(ax2.get_zorder()+1); ax.patch.set_visible(False)
ax.set_xlabel("días desde la lluvia del 9/10/2026"); ax.set_ylabel("subida del eco NISAR HH (dB)")
for r,t in zip(f,["11/10 órb.161","16/10 órb.060","19/10 órb.111","23/10 órb.161*"]): ax.annotate(t,(r["dias"],3.6),ha="center",fontsize=8)
ax.set_ylim(-1,4); ax.set_xlim(-1,15); ax.legend(loc="upper right",fontsize=8)
ax.set_title("Baqui · cómo se secan los caminos después de la lluvia (NISAR, datos reales)")
fig.text(0.01,0.01,"* 23/10: versión distinta del producto (P05036) y 7 mm de lluvia el 21-23/10: tomar con cuidado.",fontsize=7)
plt.tight_layout(); plt.savefig("datos/nisar/secado_caminos.png",dpi=110); print("ok")
