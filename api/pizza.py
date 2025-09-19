from http.server import BaseHTTPRequestHandler
import json
import io
import base64
import numpy as np
import pandas as pd

# Import matplotlib and mplsoccer
try:
    import matplotlib
    matplotlib.use('Agg')  # Use non-interactive backend
    import matplotlib.pyplot as plt
    from matplotlib import font_manager as fm
    from mplsoccer import PyPizza
    import os
    
    # Load Gabarito font if available (check multiple locations + env var)
    try:
        root_dir = os.path.dirname(os.path.dirname(__file__))
        candidates = [
            os.path.join(root_dir, 'Gabarito.ttf'),
            os.path.join(os.path.dirname(__file__), 'Gabarito.ttf'),
            os.environ.get('GABARITO_TTF', ''),
        ]
        font_path = next((p for p in candidates if p and os.path.exists(p)), None)
        if font_path:
            fm.fontManager.addfont(font_path)
            font_normal = fm.FontProperties(fname=font_path, weight='normal')
            font_bold = fm.FontProperties(fname=font_path, weight='bold')
        else:
            font_normal = fm.FontProperties(weight='normal')
            font_bold = fm.FontProperties(weight='bold')
    except Exception:
        font_normal = fm.FontProperties(weight='normal')
        font_bold = fm.FontProperties(weight='bold')
    
    HAS_DEPS = True
except ImportError:
    HAS_DEPS = False
    font_normal = None
    font_bold = None

def create_pizza_chart(player_data, light_theme=True):
    if not HAS_DEPS:
        return None
    
    # Accept multiple possible keys for labels/params from different clients
    stat_cols = (
        player_data.get('stat_labels')
        or player_data.get('labels')
        or player_data.get('params')
        or []
    )
    if not stat_cols:
        return None
    
    pcts = []
    raw_vals = []
    
    perc_map = (
        player_data.get('percentiles')
        or player_data.get('pcts')
        or player_data.get('values_map')
        or {}
    )
    stats_map = player_data.get('stats') or player_data.get('raw_stats') or {}

    for stat in stat_cols:
        pct = perc_map.get(stat, 0.0)
        val = stats_map.get(stat, np.nan)
        
        pcts.append(float(np.clip(pct, 0.0, 100.0)))
        raw_vals.append(None if pd.isna(val) else float(val))
    
    slice_colors = ["#2E4374", "#1A78CF", "#D70232", "#FF9300", "#44C3A1",
                    "#CA228D", "#E1C340", "#7575A9", "#9DDFD3"] * 6
    slice_colors = slice_colors[:len(stat_cols)]
    text_colors = ["#000000"] * len(slice_colors)
    
    # Colors per theme
    param_color = "#000000" if light_theme else "#ffffff"
    value_txt_color = "#000000" if light_theme else "#ffffff"
    
    baker = PyPizza(
        params=stat_cols,
        background_color="none",  # Transparent background
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
        figsize=(10, 10),
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
    
    ax.set_position([0.02, 0.02, 0.96, 0.96])
    
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=200, bbox_inches='tight', 
                facecolor='none', edgecolor='none', transparent=True)
    plt.close(fig)
    buf.seek(0)
    
    return buf.getvalue()

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length) if content_length else b"{}"
            data = json.loads(post_data.decode('utf-8')) if post_data else {}

            # Accept both nested and flat payloads
            player_data = data.get('player') or data

            # Determine theme preference with multiple fallbacks
            light_theme = True
            if isinstance(data.get('light_theme'), bool):
                light_theme = data['light_theme']
            else:
                theme_val = (
                    data.get('theme')
                    or data.get('mode')
                    or player_data.get('theme')
                    or player_data.get('mode')
                )
                if isinstance(theme_val, str):
                    t = theme_val.lower()
                    # Treat 'sleek' and 'dusk' as dark modes
                    light_theme = t in ('light', 'day', 'default')
            
            png_bytes = create_pizza_chart(player_data, light_theme)
            
            if png_bytes:
                b64_string = base64.b64encode(png_bytes).decode('utf-8')
                response = {"image": f"data:image/png;base64,{b64_string}"}
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type')
                self.end_headers()
                
                self.wfile.write(json.dumps(response).encode('utf-8'))
            else:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Failed to generate chart"}).encode('utf-8'))
                
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
