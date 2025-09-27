from http.server import BaseHTTPRequestHandler
import json
import base64
import math
import os

def create_pizza_svg(player_data, light_theme=True):
    # labels
    labels = (
        player_data.get('stat_labels')
        or player_data.get('labels')
        or player_data.get('params')
        or []
    )
    if not labels:
        return None

    # values
    perc_map = (
        player_data.get('percentiles')
        or player_data.get('pcts')
        or player_data.get('values_map')
        or {}
    )
    raw_map = player_data.get('stats') or player_data.get('raw_stats') or {}

    pcts = []
    raws = []
    for stat in labels:
        pct = perc_map.get(stat, 0.0)
        try:
            pct = float(pct)
        except Exception:
            pct = 0.0
        if pct < 0: pct = 0.0
        if pct > 100: pct = 100.0
        pcts.append(pct)

        v = raw_map.get(stat, None)
        try:
            vv = float(v)
            if math.isnan(vv): vv = None
            else: vv = vv
        except Exception:
            vv = None
        raws.append(vv)

    # basic geometry
    n = len(labels)
    cx, cy = 250, 250
    R0 = 40    # inner radius
    R = 190    # variable max radius
    labelR = 220
    guideRs = [R0 + (R-R0) * t for t in (0.25, 0.5, 0.75, 1.0)]
    start_angle = -math.pi/2

    # palette and text color
    palette = ["#2E4374", "#1A78CF", "#D70232", "#FF9300", "#44C3A1",
               "#CA228D", "#E1C340", "#7575A9", "#9DDFD3"]
    colors = [palette[i % len(palette)] for i in range(n)]
    # Base ink: all text light on dark themes; dark on light theme
    ink = "#000000" if light_theme else "#ffffff"

    # Utility: compute perceived luminance of hex color
    def hex_to_rgb(h):
        h = h.lstrip('#')
        if len(h) == 3:
            h = ''.join([c*2 for c in h])
        try:
            return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
        except Exception:
            return (127, 127, 127)

    def luminance_hex(h):
        r, g, b = hex_to_rgb(h)
        # sRGB luminance approximation
        return 0.2126*(r/255) + 0.7152*(g/255) + 0.0722*(b/255)

    def pol(r, ang):
        return (cx + r*math.cos(ang), cy + r*math.sin(ang))

    def arc_path(r, a0, a1):
        x0, y0 = pol(r, a0)
        x1, y1 = pol(r, a1)
        large = 1 if (a1 - a0) % (2*math.pi) > math.pi else 0
        return f"A {r:.1f} {r:.1f} 0 {large} 1 {x1:.1f} {y1:.1f}"

    # build SVG elements
    parts = []
    parts.append(f"<svg xmlns='http://www.w3.org/2000/svg' width='500' height='500' viewBox='0 0 500 500' style='background:transparent'>")
    parts.append("<defs><style>")
    parts.append("text{font-family:Gabarito,Inter,system-ui,Segoe UI,Arial,sans-serif}")
    parts.append("</style></defs>")

    # guides
    for gr in guideRs:
        parts.append(f"<circle cx='{cx}' cy='{cy}' r='{gr:.1f}' fill='none' stroke='{ink}' stroke-opacity='0.18' stroke-width='1'/>")

    # slices
    for i, (pct, col) in enumerate(zip(pcts, colors)):
        a0 = start_angle + i * (2*math.pi / n)
        a1 = start_angle + (i+1) * (2*math.pi / n)
        r = R0 + (R - R0) * (pct / 100.0)
        # wedge path: center -> edge at a0 -> arc to a1 -> back to center
        x0, y0 = pol(r, a0)
        path = [f"M {cx:.1f} {cy:.1f}", f"L {x0:.1f} {y0:.1f}", arc_path(r, a0, a1), f"L {cx:.1f} {cy:.1f} Z"]
        parts.append(f"<path d='{' '.join(path)}' fill='{col}' fill-opacity='0.85' stroke='{ink}' stroke-opacity='0.35' stroke-width='1' />")

    # labels and values
    for i, (label, pct, val) in enumerate(zip(labels, pcts, raws)):
        a = start_angle + (i + 0.5) * (2*math.pi / n)
        lx, ly = pol(labelR, a)
        anchor = 'start' if math.cos(a) > 0.25 else ('end' if math.cos(a) < -0.25 else 'middle')
        # Outer labels: follow theme ink (light on dark theme, dark on light theme)
        parts.append(f"<text x='{lx:.1f}' y='{ly:.1f}' fill='{ink}' font-size='12' text-anchor='{anchor}' dominant-baseline='middle'>{label}</text>")
        # value text slightly inward
        vx, vy = pol(R0 + (R - R0) * (pct/100.0) * 0.72, a)
        if val is not None:
            sval = (str(int(round(val))) if float(val).is_integer() else f"{val:.2f}")
            # Per-slice value text color: light text on dark slice, dark on light slice
            slice_col = colors[i]
            lum = luminance_hex(slice_col)
            value_ink = '#ffffff' if lum < 0.5 else '#000000'
            # If theme is light and slice is very light, nudge to darker ink for contrast
            if light_theme and lum > 0.85:
                value_ink = '#111111'
            # If theme is dark and slice is very dark, keep it bright
            if not light_theme and lum < 0.15:
                value_ink = '#f5f7fa'
            parts.append(f"<text x='{vx:.1f}' y='{vy:.1f}' fill='{value_ink}' font-size='11' text-anchor='middle' dominant-baseline='middle'>{sval}</text>")

    parts.append("</svg>")
    return "".join(parts)
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
                    # Treat 'sleek' and 'dusk' as dark modes; light otherwise
                    light_theme = t in ('light', 'day', 'default')

            svg = create_pizza_svg(player_data, light_theme)

            if svg:
                b64_string = base64.b64encode(svg.encode('utf-8')).decode('utf-8')
                response = {"image": f"data:image/svg+xml;base64,{b64_string}"}
                
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
