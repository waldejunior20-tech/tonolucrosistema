import sys
import os

def generate_variant(color_mode="dark", output_path="variant.svg"):
    colors = {
        "dark": {"bg": "#06142E", "primary": "#FFFFFF", "accent": "#0091FF"},
        "light": {"bg": "#FFFFFF", "primary": "#06142E", "accent": "#0091FF"}
    }
    
    c = colors.get(color_mode, colors["dark"])
    
    svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <style>
      .font-tono {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 800; font-size: 52px; letter-spacing: -1.5px; }}
      .font-lucro {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 400; font-size: 52px; letter-spacing: -1.5px; }}
    </style>
  </defs>
  <rect x="0" y="0" width="500" height="500" fill="{c['bg']}"/>
  <g transform="translate(150, 130)">
    <rect x="0" y="0" width="130" height="35" fill="{c['primary']}"/>
    <rect x="65" y="35" width="45" height="115" fill="{c['primary']}"/>
    <rect x="125" y="60" width="45" height="90" fill="{c['primary']}"/>
    <rect x="125" y="115" width="90" height="35" fill="{c['primary']}"/>
    <rect x="125" y="25" width="45" height="35" fill="{c['accent']}"/>
    <path d="M 125,25 L 185,-35 L 150,-35 L 150,-55 L 205,-55 L 205,0 L 185,0 L 185,-20 L 145,25 Z" fill="{c['accent']}"/>
  </g>
  <g transform="translate(135, 395)">
    <text x="0" y="0" class="font-tono" fill="{c['primary']}">tôno</text>
    <text x="115" y="0" class="font-lucro" fill="{c['accent']}">lucro</text>
  </g>
</svg>"""
    
    with open(output_path, "w") as f:
        f.write(svg_content)
    print(f"Variant generated: {output_path}")

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "dark"
    out = sys.argv[2] if len(sys.argv) > 2 else "logo_variant.svg"
    generate_variant(mode, out)
