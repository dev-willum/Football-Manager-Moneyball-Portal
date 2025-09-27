from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd
import io
import base64

# Import matplotlib and mplsoccer
try:
    import matplotlib
    matplotlib.use('Agg')  # Use non-interactive backend
    import matplotlib.pyplot as plt
    from matplotlib import font_manager as fm
    from mplsoccer import PyPizza
    import os
    
    # Load Gabarito font from working directory
    try:
        gabarito_path = os.path.join(os.getcwd(), 'Gabarito.ttf')
        if os.path.exists(gabarito_path):
            fm.fontManager.addfont(gabarito_path)
            font_normal = fm.FontProperties(fname=gabarito_path, weight='normal')
            font_bold = fm.FontProperties(fname=gabarito_path, weight='bold')
        else:
            # Fallback to default fonts if Gabarito not available
            font_normal = fm.FontProperties(weight='normal')
            font_bold = fm.FontProperties(weight='bold')
    except:
        # Fallback to default fonts if Gabarito not available
        font_normal = fm.FontProperties(weight='normal')
        font_bold = fm.FontProperties(weight='bold')
    
    HAS_DEPS = True
except ImportError:
    HAS_DEPS = False
    font_normal = None
    font_bold = None

app = FastAPI(title="FM Analytics Pizza Chart API")

# Add CORS middleware to allow requests from your React app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PlayerData(BaseModel):
    name: str
    club: str = ""
    position: str = ""
    age: Optional[int] = None
    minutes: Optional[int] = None
    appearances: Optional[int] = None
    league: str = ""
    stats: Dict[str, float]
    percentiles: Dict[str, float]
    stat_labels: List[str]

class PizzaRequest(BaseModel):
    player: PlayerData
    title: str = ""
    light_theme: bool = True

def create_pizza_chart(request: PizzaRequest) -> bytes:
    if not HAS_DEPS:
        raise HTTPException(status_code=500, detail="Required dependencies not available")
    
    player = request.player
    stat_cols = player.stat_labels
    
    if not stat_cols:
        raise HTTPException(status_code=400, detail="No stats provided")
    
    pcts = []
    raw_vals = []
    
    for stat in stat_cols:
        pct = player.percentiles.get(stat, 0.0)
        val = player.stats.get(stat, np.nan)
        
        pcts.append(float(np.clip(pct, 0.0, 100.0)))
        raw_vals.append(None if pd.isna(val) else float(val))
    
    slice_colors = ["#2E4374", "#1A78CF", "#D70232", "#FF9300", "#44C3A1",
                    "#CA228D", "#E1C340", "#7575A9", "#9DDFD3"] * 6
    slice_colors = slice_colors[:len(stat_cols)]
    
    # Make text colors white by default (better for dark themes), black only for light theme
    text_colors = ["#ffffff" if not request.light_theme else "#000000"] * len(slice_colors)
    
    bg = "none"  # Transparent background
    # White text for dark themes (sleek/dusk), black for light
    param_color = "#ffffff" if not request.light_theme else "#000000"
    value_txt_color = "#ffffff" if not request.light_theme else "#000000"
    
    baker = PyPizza(
        params=stat_cols,
        background_color=bg,
        straight_line_color="#000000",
        straight_line_lw=0.3,
        last_circle_color="#000000",
        last_circle_lw=1,
        other_circle_lw=0,
        inner_circle_size=0.30
    )
    
    def _fmt_val(x):
        if x is None or pd.isna(x): 
            return None
        if float(x).is_integer():
            return int(round(float(x)))
        return round(float(x), 2)
    
    fig, ax = baker.make_pizza(
        pcts,
        alt_text_values=[_fmt_val(v) for v in raw_vals],
        figsize=(10, 10),  # Larger size
        color_blank_space="same",
        slice_colors=slice_colors,
        value_colors=text_colors,
        value_bck_colors=slice_colors,
        blank_alpha=0.40,
        kwargs_slices=dict(edgecolor="#000000", zorder=2, linewidth=1),
        kwargs_params=dict(color=param_color, fontsize=13, va="center", fontproperties=font_normal),
        kwargs_values=dict(
            color=value_txt_color,
            fontsize=12,
            fontproperties=font_normal,
            zorder=3,
            bbox=dict(edgecolor="#000000", facecolor="cornflowerblue",
                      boxstyle="round,pad=0.16", lw=1)
        ),
    )
    
    ax.set_position([0.02, 0.02, 0.96, 0.96])  # Use almost full space
    
    # No headers/titles - just the pizza chart
    
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=200, bbox_inches='tight', 
                facecolor='none', edgecolor='none', transparent=True)  # Transparent background
    plt.close(fig)
    buf.seek(0)
    
    return buf.getvalue()
    
    ax.set_position([0.06, 0.07, 0.88, 0.77])
    
    fig.text(0.5, 0.988, player.name, ha='center', va='top', fontsize=18,
             color=param_color, weight='bold')
    
    sub1_bits = []
    if player.position:
        sub1_bits.append(player.position)
    if player.age:
        sub1_bits.append(f"Age {player.age}")
    if player.club:
        sub1_bits.append(player.club)
    if player.league:
        sub1_bits.append(player.league)
    
    if sub1_bits:
        sub1 = "  ".join(sub1_bits)
        fig.text(0.5, 0.954, sub1, ha='center', va='top', fontsize=12,
                 color=param_color)
    
    sub2_bits = []
    if player.minutes:
        sub2_bits.append(f"Minutes {player.minutes:,}")
    if player.appearances:
        sub2_bits.append(f"Apps {player.appearances:,}")
    
    if sub2_bits:
        sub2 = "  ".join(sub2_bits)
        fig.text(0.5, 0.93, sub2, ha='center', va='top', fontsize=10,
                 color=param_color)
    
    if request.title:
        fig.text(0.5, 0.91, request.title, ha='center', va='top', fontsize=10,
                 color=param_color)
    
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=150, bbox_inches='tight', 
                facecolor=bg, edgecolor='none')
    plt.close(fig)
    buf.seek(0)
    
    return buf.getvalue()

@app.post("/pizza")
async def generate_pizza(request: PizzaRequest):
    try:
        png_bytes = create_pizza_chart(request)
        return StreamingResponse(
            io.BytesIO(png_bytes),
            media_type="image/png",
            headers={"Content-Disposition": "inline; filename=pizza.png"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/pizza/base64")
async def generate_pizza_base64(request: PizzaRequest):
    try:
        png_bytes = create_pizza_chart(request)
        b64_string = base64.b64encode(png_bytes).decode('utf-8')
        return {"image": f"data:image/png;base64,{b64_string}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "has_dependencies": HAS_DEPS
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
