"""Rebuild the NIT Rourkela seal as vector components, from logo-full-1200.jpg.

Each component (ribbon, banner, gear, compass, torch, set square, lightning) becomes a set of
filled/stroked paths in the 1200 x 1200 space of the source image, so the opening sequence can
draw them at any size without pixelating.

  * The gear is generated from measured geometry (centre, radii, 9 teeth with radial sides).
  * Ribbon, banner, their lettering and the flame are traced: the image is upscaled 3x (bicubic)
    before each pixel is assigned its nearest palette colour, so outlines fall between source
    pixels, then contours are simplified and smoothed into quadratic curves.
  * Parts that are partly hidden in the assembled seal (compass arms, torch, set square) are
    completed: convex pieces from the convex hull of what is visible, the set square's hole from
    the smallest triangle around its visible part, the torch's column extended to its point.
    They are whole when they fly in, and the hidden parts stay hidden once assembled.

    python build_seal.py            # writes ../seal.js and ../seal.svg

Requires numpy and opencv-python.
"""
import json
import math
from pathlib import Path

import cv2
import numpy as np

HERE = Path(__file__).resolve().parent
SRC = HERE / "logo-full-1200.jpg"
OUT_JS = HERE.parent / "seal.js"
OUT_SVG = HERE.parent / "seal.svg"
UP = 3  # upsampling factor for tracing

PALETTE = {
    "bg": (247, 247, 247),
    "black": (4, 1, 1),
    "gear": (183, 85, 54),
    "gold": (251, 198, 123),
    "text": (103, 58, 7),
    "cream": (248, 233, 212),
    "stone": (179, 168, 143),
    "red": (159, 22, 15),
    "flame": (234, 78, 42),
}
NAMES = list(PALETTE)
COLOURS = {  # what is drawn (the source's own colours)
    "black": "#050101", "gear": "#b75536", "gold": "#fbc67b", "text": "#673a07",
    "cream": "#f8e9d4", "stone": "#b2a893", "red": "#9f160f", "flame": "#ea4e2a", "white": "#ffffff",
}
OUTLINE = 4.2        # black outline of the gear, ribbon, banner, set square (source px)
THIN = 2.6           # outline of compass, torch

img = cv2.imread(str(SRC))[:, :, ::-1].astype(np.float32)
H, W = img.shape[:2]


# ---- classification ------------------------------------------------------------------------
def classify(rgb: np.ndarray) -> np.ndarray:
    """Index into NAMES of the nearest palette colour, per pixel."""
    best = np.full(rgb.shape[:2], np.inf, np.float32)
    idx = np.zeros(rgb.shape[:2], np.uint8)
    for i, n in enumerate(NAMES):
        d = ((rgb - np.array(PALETTE[n], np.float32)) ** 2).sum(2)
        better = d < best
        best[better] = d[better]
        idx[better] = i
    return idx


LAB1 = classify(img)


def mask1(*names):
    return np.isin(LAB1, [NAMES.index(n) for n in names])


def upsampled_labels(x0, y0, x1, y1):
    crop = img[y0:y1, x0:x1]
    up = cv2.resize(crop, None, fx=UP, fy=UP, interpolation=cv2.INTER_CUBIC)
    return classify(np.clip(up, 0, 255))


# ---- geometry helpers -----------------------------------------------------------------------
def r1(v):
    return float(f"{v:.1f}")


def contour_points(c, x0, y0):
    """OpenCV contour at UP scale -> list of (x, y) in source space."""
    p = c.reshape(-1, 2).astype(np.float64)
    return [(x0 + (x + 0.5) / UP - 0.5, y0 + (y + 0.5) / UP - 0.5) for x, y in p]


def smooth_path(points, closed=True, corner_deg=40):
    """Points of a simplified contour -> SVG path: quadratic curves through edge midpoints,
    with real corners (turn > corner_deg) kept sharp."""
    n = len(points)
    if n < 3:
        return ""
    P = [np.array(p) for p in points]

    def turn(i):
        a, b, c = P[i - 1], P[i], P[(i + 1) % n]
        u, v = b - a, c - b
        nu, nv = np.linalg.norm(u), np.linalg.norm(v)
        if nu == 0 or nv == 0:
            return 0
        return math.degrees(math.acos(max(-1, min(1, float(u @ v / (nu * nv))))))

    sharp = [turn(i) > corner_deg for i in range(n)]
    mid = [(P[i] + P[(i + 1) % n]) / 2 for i in range(n)]
    # start at the midpoint before point 0
    d = [f"M{r1(mid[-1][0])} {r1(mid[-1][1])}"]
    for i in range(n):
        if sharp[i]:
            d.append(f"L{r1(P[i][0])} {r1(P[i][1])}L{r1(mid[i][0])} {r1(mid[i][1])}")
        else:
            d.append(f"Q{r1(P[i][0])} {r1(P[i][1])} {r1(mid[i][0])} {r1(mid[i][1])}")
    return "".join(d) + "Z"


def poly_path(points):
    return "M" + "L".join(f"{r1(x)} {r1(y)}" for x, y in points) + "Z"


def traced(mask_up, x0, y0, eps=0.45, mode=cv2.RETR_EXTERNAL, min_area=30, corner=40):
    """Mask at UP scale -> one SVG path (all contours, holes included for RETR_CCOMP)."""
    m = (mask_up > 0).astype(np.uint8)
    cs, _ = cv2.findContours(m, mode, cv2.CHAIN_APPROX_NONE)
    parts = []
    for c in cs:
        if abs(cv2.contourArea(c)) < min_area * UP * UP:
            continue
        a = cv2.approxPolyDP(c, eps * UP, True)
        parts.append(smooth_path(contour_points(a, x0, y0), corner_deg=corner))
    return "".join(parts)


def clean(m, k=1):
    """Remove one-pixel slivers left by anti-aliased edges."""
    ker = np.ones((2 * k + 1, 2 * k + 1), np.uint8)
    return cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, ker)


def fill_holes(m):
    m = m.astype(np.uint8)
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    out = np.zeros_like(m)
    cv2.drawContours(out, cs, -1, 1, -1)
    return out


def offset_convex(poly, d):
    """Offset a convex polygon (clockwise or not) outwards by d."""
    P = np.array(poly, float)
    n = len(P)
    area = sum(P[i][0] * P[(i + 1) % n][1] - P[(i + 1) % n][0] * P[i][1] for i in range(n))
    sign = 1 if area > 0 else -1
    lines = []
    for i in range(n):
        a, b = P[i], P[(i + 1) % n]
        t = (b - a) / np.linalg.norm(b - a)
        nrm = np.array([t[1], -t[0]]) * sign  # outward normal
        lines.append((a + nrm * d, t))
    out = []
    for i in range(n):
        (p1, t1), (p2, t2) = lines[i - 1], lines[i]
        A = np.array([t1, -t2]).T
        s = np.linalg.solve(A, p2 - p1)
        out.append(tuple(p1 + t1 * s[0]))
    return out


def offset_poly(poly, d):
    """Offset a simple polygon outwards by d with mitred corners (works for concave shapes)."""
    P = np.array(poly, float)
    n = len(P)
    area = sum(P[i][0] * P[(i + 1) % n][1] - P[(i + 1) % n][0] * P[i][1] for i in range(n))
    sign = 1 if area > 0 else -1
    out = []
    for i in range(n):
        a, b, c = P[i - 1], P[i], P[(i + 1) % n]
        t1 = (b - a) / np.linalg.norm(b - a)
        t2 = (c - b) / np.linalg.norm(c - b)
        n1 = np.array([t1[1], -t1[0]]) * sign
        n2 = np.array([t2[1], -t2[0]]) * sign
        bis = n1 + n2
        if np.linalg.norm(bis) < 1e-6:
            out.append(tuple(b + n1 * d))
            continue
        bis /= np.linalg.norm(bis)
        out.append(tuple(b + bis * d / max(bis @ n1, 0.2)))
    return out


def hull_of(mask, x0=0, y0=0, scale=1):
    ys, xs = np.nonzero(mask)
    pts = np.c_[xs, ys].astype(np.float32)
    h = cv2.convexHull(pts).reshape(-1, 2)
    return [(x0 + (x + 0.5) / scale - 0.5, y0 + (y + 0.5) / scale - 0.5) for x, y in h]


def simplify(points, eps):
    c = np.array(points, np.float32).reshape(-1, 1, 2)
    return [tuple(p) for p in cv2.approxPolyDP(c, eps, True).reshape(-1, 2)]


parts = []


def part(pid, layers, note=""):
    xs, ys = [], []
    for L in layers:
        nums = [float(v) for v in __import__("re").findall(r"-?\d+\.?\d*", L["d"])]
        xs += nums[0::2]; ys += nums[1::2]
    pivot = [r1((min(xs) + max(xs)) / 2), r1((min(ys) + max(ys)) / 2)]
    parts.append({"id": pid, "pivot": pivot, "layers": layers})
    print(f"{pid:12s} {len(layers)} layer(s), {sum(len(L['d']) for L in layers)} chars  {note}")


# ---- regions --------------------------------------------------------------------------------
not_bg = ~mask1("bg")
n, lab, stats, _ = cv2.connectedComponentsWithStats(not_bg.astype(np.uint8), 8)
regions = sorted(range(1, n), key=lambda i: -stats[i, cv2.CC_STAT_AREA])[:2]
# The seal body (gear and emblem) is one region; the ribbon and the banner below it touch, so
# they come out as one region: split it at its thinnest row between the two.
body, scroll = regions[0], regions[1]
rows = (lab == scroll).sum(1)
sx, sy, sw, sh = stats[scroll, :4]
search = range(sy + int(sh * 0.8), sy + sh - 20)
cut = min(search, key=lambda y: rows[y])
lab[(lab == scroll) & (np.arange(H)[:, None] >= cut)] = n  # the banner becomes label n
ribbon, banner = scroll, n
boxes = {}
for rid in (ribbon, banner):
    ys, xs = np.nonzero(lab == rid)
    boxes[rid] = (xs.min(), ys.min(), xs.max() - xs.min() + 1, ys.max() - ys.min() + 1)
print("ribbon/banner split at row", cut, boxes)


def region_layers(rid, inner_names, text_name=None):
    x, y, w, h = boxes[rid]
    x0, y0, x1, y1 = max(0, x - 3), max(0, y - 3), min(W, x + w + 3), min(H, y + h + 3)
    L = upsampled_labels(x0, y0, x1, y1)
    own = cv2.resize((lab[y0:y1, x0:x1] == rid).astype(np.uint8), None, fx=UP, fy=UP, interpolation=cv2.INTER_NEAREST)
    own = cv2.dilate(own, np.ones((5, 5), np.uint8))
    sil = fill_holes(clean(np.isin(L, [NAMES.index(k) for k in NAMES if k != "bg"]) & (own > 0), 1))
    inner = clean(np.isin(L, [NAMES.index(k) for k in inner_names + ([text_name] if text_name else [])]) & (own > 0), 1)
    layers = [
        {"d": traced(sil, x0, y0, eps=0.4), "fill": COLOURS["black"]},
        {"d": traced(fill_holes(inner) if text_name else inner, x0, y0, eps=0.4), "fill": COLOURS[inner_names[0]]},
    ]
    if text_name:
        t = clean(L == NAMES.index(text_name), 1)
        layers.append({"d": traced(t, x0, y0, eps=0.35, mode=cv2.RETR_CCOMP, min_area=4, corner=55), "fill": COLOURS[text_name], "rule": "evenodd"})
    return layers


part("ribbon", region_layers(ribbon, ["gold"], "text"), "traced")
part("banner", region_layers(banner, ["gold"], "text"), "traced")

# ---- gear -----------------------------------------------------------------------------------
# The drawing is hand-made: its teeth are not evenly spaced and the hole is not quite centred on
# them. So the gear is measured, not idealised: the hole and the root are circles fitted to their
# black outlines, and each tooth's two sides and tip are straight lines fitted to its outline.
# Everything is fitted to the centre line of the outline, which is then stroked OUTLINE wide.
BLK = img.sum(2) < 120
YY, XX = np.mgrid[:H, :W]
TEETH = 9
C0 = (598.4, 512.8)  # first estimate of the centre (see measurements in the commit notes)


def fit_circle(xs, ys, rounds=4, keep=2.0):
    sel = np.ones(len(xs), bool)
    for _ in range(rounds):
        A = np.c_[2 * xs[sel], 2 * ys[sel], np.ones(sel.sum())]
        b = xs[sel] ** 2 + ys[sel] ** 2
        cx, cy, c = np.linalg.lstsq(A, b, rcond=None)[0]
        r = math.sqrt(c + cx * cx + cy * cy)
        sel = np.abs(np.hypot(xs - cx, ys - cy) - r) < keep
    return cx, cy, r


def fit_line(xs, ys, rounds=4, keep=1.5):
    """Total least squares line through points; returns (point, unit direction)."""
    sel = np.ones(len(xs), bool)
    for _ in range(rounds):
        P = np.c_[xs[sel], ys[sel]].astype(float)
        m = P.mean(0)
        _, _, vt = np.linalg.svd(P - m)
        d = vt[0]
        nrm = np.array([-d[1], d[0]])
        sel = np.abs((np.c_[xs, ys] - m) @ nrm) < keep
    return m, d


def line_meet(p, d, q, e):
    A = np.array([d, -e]).T
    t = np.linalg.solve(A, q - p)
    return p + d * t[0]


def line_circle(p, d, c, r, near):
    """Intersection of a line with a circle, the one nearest `near`."""
    f = p - c
    b, cc = f @ d, f @ f - r * r
    disc = math.sqrt(max(b * b - cc, 0))
    pts = [p + d * (-b - disc), p + d * (-b + disc)]
    return min(pts, key=lambda q: np.linalg.norm(q - near))


rr = np.hypot(XX - C0[0], YY - C0[1])
ang = (np.degrees(np.arctan2(YY - C0[1], XX - C0[0])) + 360) % 360
ring = BLK & (rr > 262) & (rr < 292)
hcx, hcy, hole_r = fit_circle(XX[ring].astype(float), YY[ring].astype(float))
# The hole is drawn very slightly oval (about 1%): fit an ellipse to its outline as well.
ept = np.c_[XX[ring], YY[ring]].astype(np.float32)
for _ in range(3):
    (ex, ey), (ew, eh), erot = cv2.fitEllipse(ept)
    t = math.radians(erot)
    du, dv = ept[:, 0] - ex, ept[:, 1] - ey
    u, v = du * math.cos(t) + dv * math.sin(t), -du * math.sin(t) + dv * math.cos(t)
    q = np.sqrt((u / (ew / 2)) ** 2 + (v / (eh / 2)) ** 2)
    ept = ept[np.abs(q - 1) < 2.0 / 275]
hcx, hcy, erx, ery = ex, ey, ew / 2, eh / 2
# Tooth centres (degrees, clockwise from +x): where the outline reaches out beyond the root.
outer = BLK & (rr > 395) & (rr < 425)
hist = np.bincount((ang[outer] * 2).astype(int), minlength=720)
centres = []
for k in range(TEETH):
    lo = 32.8 + 40 * k - 15  # around the measured tooth positions
    idx = [int((lo + j / 2) % 360 * 2) for j in range(60)]
    w = hist[idx]
    centres.append((lo + (np.argmax(np.cumsum(w) >= w.sum() / 2)) / 2) % 360)
root_pts = BLK & (rr > 326) & (rr < 342)
gaps = np.ones_like(root_pts)
for c in centres:
    gaps &= np.abs((ang - c + 180) % 360 - 180) > 14
rcx, rcy, root_r = fit_circle(XX[root_pts & gaps].astype(float), YY[root_pts & gaps].astype(float))
hole_c, root_c = np.array([hcx, hcy]), np.array([rcx, rcy])

teeth = []
for c in centres:
    off = (ang - c + 180) % 360 - 180
    u = np.array([math.cos(math.radians(c)), math.sin(math.radians(c))])
    sides = []
    for sgn in (-1, 1):
        m = BLK & (rr > 350) & (rr < 395) & (off * sgn > 4) & (off * sgn < 14)
        sides.append(fit_line(XX[m].astype(float), YY[m].astype(float)))
    tip_m = BLK & (rr > 398) & (rr < 425) & (np.abs(off) < 7)
    tp, td = fit_line(XX[tip_m].astype(float), YY[tip_m].astype(float))
    corners = []
    for p, d in sides:
        base = line_circle(p, d, root_c, root_r, root_c + u * root_r)
        top = line_meet(p, d, tp, td)
        corners.append((base, top))
    (b0, t0), (b1, t1) = corners  # sgn -1 (anticlockwise side) first
    teeth.append([b0, t0, t1, b1])


def gear_path():
    d = []
    for i, (b0, t0, t1, b1) in enumerate(teeth):
        d.append(("M" if i == 0 else "L") + f"{r1(b0[0])} {r1(b0[1])}")
        d.append("".join(f"L{r1(p[0])} {r1(p[1])}" for p in (t0, t1, b1)))
        nb = teeth[(i + 1) % TEETH][0]
        d.append(f"A{r1(root_r)} {r1(root_r)} 0 0 1 {r1(nb[0])} {r1(nb[1])}")
    d.append("Z")
    t = math.radians(erot)
    ax, ay = erx * math.cos(t), erx * math.sin(t)
    arc = f"{r1(erx)} {r1(ery)} {r1(erot)} 1 0"
    d.append(f"M{r1(hcx + ax)} {r1(hcy + ay)}A{arc} {r1(hcx - ax)} {r1(hcy - ay)}A{arc} {r1(hcx + ax)} {r1(hcy + ay)}Z")
    return "".join(d)


GEAR = dict(cx=r1(hcx), cy=r1(hcy), hole=r1(min(erx, ery)), root=r1(root_r), teeth=TEETH)
parts.append({"id": "gear", "pivot": [GEAR["cx"], GEAR["cy"]], "layers": [
    {"d": gear_path(), "fill": COLOURS["gear"], "stroke": COLOURS["black"], "width": OUTLINE, "rule": "evenodd"}]})
print(f"gear         hole centre {hcx:.2f},{hcy:.2f} semi-axes {erx:.2f} {ery:.2f} tilt {erot:.1f}; root centre {rcx:.2f},{rcy:.2f} r {root_r:.2f}; "
      f"teeth at {[round(c, 1) for c in centres]}")

# ---- emblem: work in the disc --------------------------------------------------------------
EX0, EY0, EX1, EY1 = 300, 230, 900, 830
EL = upsampled_labels(EX0, EY0, EX1, EY1)


def up_mask(*names):
    return np.isin(EL, [NAMES.index(n) for n in names])


def to_src(px, py):
    return EX0 + (px + 0.5) / UP - 0.5, EY0 + (py + 0.5) / UP - 0.5


# Lightning: front-most, fully visible. Straight edges -> exact polygon.
red = clean(up_mask("red"), 1)
cs, _ = cv2.findContours(red.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
c = max(cs, key=cv2.contourArea)
bolt = [np.array(to_src(*p)) for p in cv2.approxPolyDP(c, 1.2 * UP, True).reshape(-1, 2)]
# The bolt's two points are thinner than a pixel at the very end, so the trace stops short with a
# tiny flat end (two vertices close together). Replace each such pair by the meeting point of the
# two long edges either side of it.
changed = True
while changed:
    changed = False
    n_b = len(bolt)
    for i in range(n_b):
        a, b = bolt[i], bolt[(i + 1) % n_b]
        if np.linalg.norm(b - a) < 7:
            p0, p3 = bolt[i - 1], bolt[(i + 2) % n_b]
            d1, d2 = a - p0, b - p3
            try:
                tip = line_meet(p0, d1 / np.linalg.norm(d1), p3, d2 / np.linalg.norm(d2))
            except np.linalg.LinAlgError:
                continue
            if np.linalg.norm(tip - (a + b) / 2) < 60:
                bolt = [q for k, q in enumerate(bolt) if k not in (i, (i + 1) % n_b)]
                bolt.insert(i if i < len(bolt) + 1 else 0, tip)
                changed = True
                break
# In the drawing both points of the bolt touch the gear's inner ring: extend the two sharpest
# corners along their centre line to the ring's inner edge.
def corner_angle(i):
    a, b, c = bolt[i - 1], bolt[i], bolt[(i + 1) % len(bolt)]
    u, v = a - b, c - b
    return math.degrees(math.acos(max(-1, min(1, float(u @ v / (np.linalg.norm(u) * np.linalg.norm(v)))))))


ring_inner = min(erx, ery) - OUTLINE / 2 - 1.5  # the mitred outline must not poke through the ring
for i in sorted(range(len(bolt)), key=corner_angle)[:2]:
    a, b, c = bolt[i - 1], bolt[i], bolt[(i + 1) % len(bolt)]
    bis = (b - a) / np.linalg.norm(b - a) + (b - c) / np.linalg.norm(b - c)
    bis /= np.linalg.norm(bis)
    centre = np.array([hcx, hcy])
    f = b - centre
    q = f @ bis
    t = -q + math.sqrt(max(q * q - (f @ f - ring_inner ** 2), 0))  # forward to the ring
    if 0 < t < 40:
        bolt[i] = b + bis * t
bolt = [tuple(p) for p in bolt]
print("lightning vertices", len(bolt))

# Set square: outer triangle around the cream; the hole is the smallest triangle around the
# background visible inside it (its top is hidden behind the lightning).
cream = clean(up_mask("cream"), 2)
ys, xs = np.nonzero(cream)
_, tri = cv2.minEnclosingTriangle(np.c_[xs, ys].astype(np.float32).reshape(-1, 1, 2))
outer = [to_src(*p) for p in tri.reshape(-1, 2)]
inside = np.zeros_like(cream, np.uint8)
cv2.fillConvexPoly(inside, np.round(tri.reshape(-1, 2)).astype(np.int32), 1)
inside = cv2.erode(inside, np.ones((9, 9), np.uint8))
hole_bg = clean(up_mask("bg") & (inside > 0), 2)
ys, xs = np.nonzero(hole_bg)
_, htri = cv2.minEnclosingTriangle(np.c_[xs, ys].astype(np.float32).reshape(-1, 1, 2))
vis = [to_src(*p) for p in htri.reshape(-1, 2)]
# The lightning hides the hole's top, so the smallest triangle around what is visible is too
# short. A set square's hole runs parallel to its outer edges: rebuild it from the bottom corners.
o_top = min(outer, key=lambda p: p[1])
o_bl, o_br = sorted([p for p in outer if p is not o_top], key=lambda p: p[0])
h_bl, h_br = sorted(sorted(vis, key=lambda p: -p[1])[:2], key=lambda p: p[0])


def meet(p, d, q, e):
    A = np.array([d, [-e[0], -e[1]]]).T
    t = np.linalg.solve(A, np.array(q) - np.array(p))
    return (p[0] + d[0] * t[0], p[1] + d[1] * t[0])


right_dir = (o_top[0] - o_br[0], o_top[1] - o_br[1])
hyp_dir = (o_top[0] - o_bl[0], o_top[1] - o_bl[1])
h_top = meet(h_br, right_dir, h_bl, hyp_dir)
hole = [h_top, h_bl, h_br]
# Paths run along the middle of the black outline.
outer_c = offset_convex(outer, OUTLINE / 2)
hole_c = offset_convex(hole, -OUTLINE / 2)  # hole outline lies over the cream: shrink the hole edge
print("set square", [tuple(map(r1, p)) for p in outer], "hole", [tuple(map(r1, p)) for p in hole])

# Stone pieces: compass arms and torch.
stone1 = mask1("stone").astype(np.uint8)
stone1 = cv2.morphologyEx(stone1, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
n2, lab2, st2, cen2 = cv2.connectedComponentsWithStats(stone1, 8)
pieces = [i for i in range(1, n2) if st2[i, cv2.CC_STAT_AREA] > 40]

# Hinge: the white dot enclosed by the black ring near the top-left of the emblem.
light = (mask1("bg") | (img.sum(2) > 700)).astype(np.uint8)
n3, lab3, st3, cen3 = cv2.connectedComponentsWithStats(light, 4)
dots = [i for i in range(1, n3) if 100 < st3[i, cv2.CC_STAT_AREA] < 900 and 460 < cen3[i][0] < 560 and 300 < cen3[i][1] < 400]
dot = max(dots, key=lambda i: st3[i, cv2.CC_STAT_AREA])
hx, hy = cen3[dot]
dot_r = math.sqrt(st3[dot, cv2.CC_STAT_AREA] / math.pi)
blk = mask1("black")
radii = []
for k in range(0, 360, 3):
    a = math.radians(k)
    r = dot_r
    while r < dot_r + 5 and not blk[int(round(hy + r * math.sin(a))), int(round(hx + r * math.cos(a)))]:
        r += 0.5
    while r < 80 and blk[int(round(hy + r * math.sin(a))), int(round(hx + r * math.cos(a)))]:
        r += 0.5
    radii.append(r)
ring_r = float(np.percentile(radii, 30))  # arms leave the ring in a few directions
print(f"hinge at {hx:.1f},{hy:.1f} dot r {dot_r:.1f} ring r {ring_r:.1f}")


def far_point(axis_from, direction, tol=1.5):
    """Where a needle ends: the farthest stone or black pixel on its axis. The arms pass behind
    the set square and end on the gear ring, so scan the whole way to the ring's outer edge."""
    ox, oy = axis_from
    dx, dy = direction
    best = None
    for s in np.arange(0, 700, 0.5):
        x, y = ox + dx * s, oy + dy * s
        if math.hypot(x - GEAR["cx"], y - GEAR["cy"]) > GEAR["root"] - 6:
            break
        for o in np.arange(-tol, tol + 0.1, 0.5):
            xi, yi = int(round(x - dy * o)), int(round(y + dx * o))
            if LAB1[yi, xi] in (NAMES.index("black"), NAMES.index("stone")):
                best = (x, y)
                break
    return best


# Torch pieces sit right of the hinge, in a narrow column; the rest belong to the two arms.
torch_ids = [i for i in pieces if 600 < cen2[i][0] < 680 and cen2[i][1] < 420]
arm_ids = [i for i in pieces if i not in torch_ids]


def unit(v):
    v = np.array(v, float)
    return v / np.linalg.norm(v)


def dist_to_axis(p, origin, d):
    v = np.array(p) - np.array(origin)
    return abs(v[0] * d[1] - v[1] * d[0])


# The compass: a short handle pointing up-left from the hinge, and two legs from the hinge, one
# to the right and one down. Each stone piece belongs to the part whose axis it lies on.
handle_ids = [i for i in arm_ids if cen2[i][0] < hx and cen2[i][1] < hy]
rest = [i for i in arm_ids if i not in handle_ids]
dirA = unit(cen2[max(rest, key=lambda i: cen2[i][0])] - np.array([hx, hy]))
dirB = unit(cen2[max(rest, key=lambda i: cen2[i][1])] - np.array([hx, hy]))
tipA = far_point((hx, hy), dirA)
tipB = far_point((hx, hy), dirB)
legA = [i for i in rest if dist_to_axis(cen2[i], (hx, hy), dirA) <= dist_to_axis(cen2[i], (hx, hy), dirB)]
legB = [i for i in rest if i not in legA]
print("compass pieces: handle", len(handle_ids), "leg A", len(legA), "leg B", len(legB),
      "tips", tuple(map(r1, tipA)), tuple(map(r1, tipB)))


def hull_path(ids, extra):
    pts = [p for i in ids for p in hull_of(lab2 == i)] + extra
    h = simplify(cv2.convexHull(np.array(pts, np.float32)).reshape(-1, 2).tolist(), 0.6)
    return smooth_path(offset_convex(h, THIN / 2), corner_deg=25)


compass_layers = [
    {"d": hull_path(handle_ids, [(hx, hy)]), "fill": COLOURS["stone"], "stroke": COLOURS["black"], "width": THIN},
    {"d": hull_path(legB, [tipB, (hx, hy)]), "fill": COLOURS["stone"], "stroke": COLOURS["black"], "width": THIN},
    {"d": hull_path(legA, [tipA, (hx, hy)]), "fill": COLOURS["stone"], "stroke": COLOURS["black"], "width": THIN},
    {"d": f"M{r1(hx + ring_r)} {r1(hy)}A{r1(ring_r)} {r1(ring_r)} 0 1 0 {r1(hx - ring_r)} {r1(hy)}A{r1(ring_r)} {r1(ring_r)} 0 1 0 {r1(hx + ring_r)} {r1(hy)}Z", "fill": COLOURS["black"]},
    {"d": f"M{r1(hx + dot_r)} {r1(hy)}A{r1(dot_r)} {r1(dot_r)} 0 1 0 {r1(hx - dot_r)} {r1(hy)}A{r1(dot_r)} {r1(dot_r)} 0 1 0 {r1(hx + dot_r)} {r1(hy)}Z", "fill": COLOURS["white"]},
]

# Torch: the column is straight where visible and narrows to a point only where the set square
# hides it; the cup and flame are fully visible, so they are traced as they are.
column = max(torch_ids, key=lambda i: st2[i, cv2.CC_STAT_HEIGHT])
cm = lab2 == column
ys, xs = np.nonzero(cm)
rows = [r for r in sorted(set(ys.tolist())) if r < ys.min() + 0.7 * (ys.max() - ys.min())]  # above the set square
colL = float(np.median([xs[ys == r].min() for r in rows])) - 0.5
colR = float(np.median([xs[ys == r].max() for r in rows])) + 0.5
top = int(ys.min())
COL_STRAIGHT, COL_POINT = 478.0, 540.0   # hidden behind the set square in the assembled seal
col_poly = [(colL, top - 2), (colR, top - 2), (colR, COL_STRAIGHT), ((colL + colR) / 2, COL_POINT), (colL, COL_STRAIGHT)]
x_tip, y_tip = (colL + colR) / 2, COL_POINT
# The head (flame and cup) is fully visible: its whole outline in black, then the stone and
# flame regions on top, so the black left between them is the drawing's own outline.
hx0, hy0, hx1, hy1 = 574, 246, 668, top + 1
HL = upsampled_labels(hx0, hy0, hx1, hy1)
head_sil = fill_holes(clean(HL != NAMES.index("bg"), 1))
cup = clean(HL == NAMES.index("stone"), 1)
flame = clean(HL == NAMES.index("flame"), 1)
torch_layers = [
    {"d": poly_path(offset_convex(col_poly, THIN / 2)), "fill": COLOURS["stone"], "stroke": COLOURS["black"], "width": THIN},
    {"d": traced(head_sil, hx0, hy0, eps=0.35, corner=50), "fill": COLOURS["black"]},
    {"d": traced(cup, hx0, hy0, eps=0.35, corner=50, min_area=8), "fill": COLOURS["stone"]},
    {"d": traced(flame, hx0, hy0, eps=0.35, corner=50, min_area=8), "fill": COLOURS["flame"]},
]
print(f"torch column x {colL:.1f}-{colR:.1f} from y {top}, point at {x_tip:.1f},{y_tip:.1f}")

parts.append({"id": "compass", "pivot": [r1(hx), r1(hy)], "layers": compass_layers})
parts.append({"id": "torch", "pivot": [r1((hx0 + hx1) / 2), r1((hy0 + y_tip) / 2)], "layers": torch_layers})
sq = {"d": poly_path(outer_c) + poly_path(hole_c), "fill": COLOURS["cream"], "stroke": COLOURS["black"], "width": OUTLINE, "rule": "evenodd"}
parts.append({"id": "setsquare", "pivot": [r1(sum(p[0] for p in outer) / 3), r1(sum(p[1] for p in outer) / 3)], "layers": [sq]})
BOLT_LINE = 2.2  # the bolt's black outline, just outside the red
parts.append({"id": "lightning", "pivot": [r1(sum(p[0] for p in bolt) / len(bolt)), r1(sum(p[1] for p in bolt) / len(bolt))],
              "layers": [{"d": poly_path(offset_poly(bolt, BOLT_LINE / 2)), "fill": COLOURS["red"], "stroke": COLOURS["black"],
                          "width": BOLT_LINE, "join": "miter"}]})

# ---- output ---------------------------------------------------------------------------------
order = ["ribbon", "banner", "gear", "compass", "torch", "setsquare", "lightning"]
parts.sort(key=lambda p: order.index(p["id"]))
data = {"size": [W, H], "gear": GEAR, "parts": parts}
OUT_JS.write_text(
    "/* NIT Rourkela seal as vector components (generated by logo-src/build_seal.py; do not edit).\n"
    "   Coordinates are in the 1200 x 1200 space of logo-src/logo-full-1200.jpg; parts are listed back to front. */\n"
    "window.NITRKL_SEAL = " + json.dumps(data, separators=(",", ":")) + ";\n",
    encoding="utf-8",
)

svg = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="NIT Rourkela seal">']
for p in parts:
    svg.append(f'<g id="seal-{p["id"]}">')
    for L in p["layers"]:
        attrs = f'd="{L["d"]}" fill="{L.get("fill", "none")}"'
        if L.get("rule"):
            attrs += f' fill-rule="{L["rule"]}"'
        if L.get("stroke"):
            attrs += f' stroke="{L["stroke"]}" stroke-width="{L["width"]}" stroke-linejoin="{L.get("join", "round")}" stroke-miterlimit="12"'
        svg.append(f"<path {attrs}/>")
    svg.append("</g>")
svg.append("</svg>")
OUT_SVG.write_text("\n".join(svg), encoding="utf-8")
print("wrote", OUT_JS.name, OUT_JS.stat().st_size, "bytes;", OUT_SVG.name, OUT_SVG.stat().st_size, "bytes")
