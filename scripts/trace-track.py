#!/usr/bin/env python3
"""
Trace a Heat board photo into a TrackGeometry for src/lib/race-log/.

    python3 scripts/trace-track.py board.png --seed 500,60 --start 270,130 --ahead 300,60 \
        --out /tmp/gb [--spaces 63] [--width 1000]

Coordinates (seed, start, ahead) are in the ORIGINAL image's pixels.
  --seed   a point on plain asphalt (picks the asphalt colour and the track component)
  --start  a point on the start/finish line
  --ahead  a point a little further along the track in the direction of travel

Writes to --out:
  mask.png      asphalt mask after closing (check the loop is one clean ring)
  debug.png     the board with the centre line, every divider numbered and the
                racing-line guess per space (R/L)
  geometry.json path, dividers, spaces, halfWidth, width, height (badges left empty)
  report.txt    divider count, spacing outliers, racing-line side per space

Requires numpy, opencv-python, scikit-image, pillow. The full workflow is in
.claude/skills/trace-track/SKILL.md. Needs a human check:
compare the divider count with the card's spaces per lap, then read the corner
lines and badge positions off debug.png.
"""
import argparse
import json
import math
import os

import cv2
import numpy as np
from PIL import Image, ImageDraw
from skimage.morphology import remove_small_holes, skeletonize


def pt(s):
    x, y = s.split(",")
    return float(x), float(y)


ap = argparse.ArgumentParser()
ap.add_argument("image")
ap.add_argument("--seed", type=pt, action="append", required=True, help="a point on plain asphalt; repeat it for boards with two asphalt colours (Spain: blue and the black tunnels)")
ap.add_argument("--waypoints", help="JSON list of [x, y] in ORIGINAL pixels along the centre line, in travel order: skip the skeleton and snap this route to the asphalt (tunnels, strips running close together)")
ap.add_argument("--start", type=pt, required=True)
ap.add_argument("--ahead", type=pt, required=True)
ap.add_argument("--out", required=True)
ap.add_argument("--spaces", type=int, help="spaces per lap printed on the card, to check the count")
ap.add_argument("--width", type=int, default=1000, help="width to trace at (the app uses 1000)")
ap.add_argument("--tol", type=float, default=22, help="Lab distance from the asphalt colour")
ap.add_argument("--close", type=int, default=9, help="closing kernel to bridge dividers and corner lines")
ap.add_argument("--min-gap", type=float, default=0.55, help="min divider spacing, as a share of the median")
ap.add_argument("--no-orange-track", dest="orange_track", action="store_false", help="don't count orange/tan pixels as track (for sand-coloured boards)")
ap.add_argument("--smooth", type=int, default=7, help="centre-line smoothing window in px (odd)")
ap.add_argument("--thin-lines", action="store_true", help="also count thin lines that are only bright next to their surroundings (white dividers on black tarmac)")
ap.add_argument("--reach", type=float, default=40, help="with --waypoints: how far (original px) either side of the route to look for the asphalt")
ap.add_argument("--drop", help="divider indices to remove (fake lines, e.g. from cars), as numbered in a previous debug.png; corner indices then refer to the result")
ap.add_argument("--add", help="dividers to add, as x,y;x,y in TRACED pixels (see report.txt scale), e.g. a corner line the score placed badly")
ap.add_argument("--corners", help="divider indices of the corner lines, in race order (from debug.png), to report the racing line per stretch")
ap.add_argument("--line-score", type=float, default=0.45, help="min share of a cross-section that must be line-coloured")
args = ap.parse_args()
os.makedirs(args.out, exist_ok=True)

src = Image.open(args.image).convert("RGB")
scale = args.width / src.width
img = src.resize((args.width, round(src.height * scale)), Image.LANCZOS)
H, W = img.height, img.width
rgb = np.asarray(img)
S = lambda p: (p[0] * scale, p[1] * scale)
seeds = [S(p) for p in args.seed]
seed, start, ahead = seeds[0], S(args.start), S(args.ahead)

# 1. Asphalt mask: close to the seed's colour in Lab
lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB).astype(float)
def colour_dist(p):
    x, y = int(p[0]), int(p[1])
    ref = np.median(lab[y - 3 : y + 4, x - 3 : x + 4].reshape(-1, 3), axis=0)
    return np.linalg.norm(lab - ref, axis=2)


dist = np.min([colour_dist(p) for p in seeds], axis=0)
sx, sy = int(seed[0]), int(seed[1])
hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV).astype(int)
Hh, Ss, Vv = hsv[..., 0], hsv[..., 1], hsv[..., 2]
# white lines must be clearly brighter than the asphalt (worn patches on light-grey asphalt are not lines)
asphalt_v = float(np.median(Vv[sy - 3 : sy + 4, sx - 3 : sx + 4]))
white = (Vv > max(150, asphalt_v + 70)) & (Ss < 70)
orange = (Hh >= 5) & (Hh <= 35) & (Ss > 45) & (Vv > 100)  # orange, yellow and tan lines
# a line must look clearly different from the asphalt (yellowish-grey asphalt passes the orange test)
orange &= dist > args.tol * 1.5
white &= dist > args.tol * 1.5
if args.thin_lines:
    # Thin lines on dark tarmac (Spain's tunnels) are faint in a photo: look for lines
    # clearly brighter than their immediate surroundings instead of bright overall.
    tophat = cv2.morphologyEx(Vv.astype(np.uint8), cv2.MORPH_TOPHAT, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    white |= (tophat > 45) & (Ss < 70)
# corner lines are orange/yellow and thick: count them as track so closing doesn't have to bridge them.
# (Known flaw: orange number boxes touching the track edge get in too and can bulge the centre line.)
# Off with --no-orange-track on boards whose surroundings are orange or sand (Italy).
raw = ((dist < args.tol) | (orange if args.orange_track else False)).astype(np.uint8)
k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (args.close, args.close))
if args.waypoints:
    # A route given by hand: no skeleton. The raw mask is only used to snap it to the asphalt.
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (args.close, args.close))
    track = cv2.morphologyEx(raw, cv2.MORPH_CLOSE, k).astype(bool)
    Image.fromarray((track * 255).astype(np.uint8)).save(os.path.join(args.out, "mask.png"))
    loop = np.array(json.load(open(args.waypoints)), float) * scale
else:
    closed = cv2.morphologyEx(raw, cv2.MORPH_CLOSE, k)
    closed = cv2.morphologyEx(closed, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    n, labels = cv2.connectedComponents(closed)
    track = labels == labels[sy, sx]
    if not track.any() or labels[sy, sx] == 0:
        raise SystemExit("seed is not on the asphalt mask; pick another --seed or raise --tol")
    track = remove_small_holes(track, 4000)
    Image.fromarray((track * 255).astype(np.uint8)).save(os.path.join(args.out, "mask.png"))
    dt = cv2.distanceTransform(track.astype(np.uint8), cv2.DIST_L2, 5)

    # 2. Skeleton → prune spurs → ordered loop
    sk = skeletonize(track).astype(np.uint8)
    nb = lambda a: cv2.filter2D(a, -1, np.ones((3, 3), np.float32), borderType=cv2.BORDER_CONSTANT) - a
    while True:
        ends = (sk == 1) & (nb(sk) <= 1)
        if not ends.any():
            break
        sk[ends] = 0
    ys, xs = np.nonzero(sk)
    pts = set(zip(xs.tolist(), ys.tolist()))
    if not pts:
        raise SystemExit("no loop in the skeleton; check mask.png")
    # The pruned skeleton can still hold small cycles (around cars on the grid,
    # or where two stretches of track touch). Collapse it into a graph of
    # junctions and chains and keep the longest simple cycle: the real lap.
    N8 = [(dx, dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if dx or dy]
    nbrs = lambda p: [(p[0] + dx, p[1] + dy) for dx, dy in N8 if (p[0] + dx, p[1] + dy) in pts]
    junction = {p for p in pts if len(nbrs(p)) >= 3}
    cluster = {}
    for p in junction:  # group touching junction pixels into one node
        if p in cluster:
            continue
        stack, cluster[p] = [p], p
        while stack:
            q = stack.pop()
            for r in nbrs(q):
                if r in junction and r not in cluster:
                    cluster[r] = p
                    stack.append(r)
    edges, used = [], set()
    for j in junction:
        for first in nbrs(j):
            if first in junction or (j, first) in used:
                continue
            chain, prev, cur = [j, first], j, first
            while cur not in junction:
                nxt = [r for r in nbrs(cur) if r != prev and r not in chain[-3:]]
                if not nxt:
                    break
                nxt.sort(key=lambda r: (r not in junction, abs(r[0] - cur[0]) + abs(r[1] - cur[1])))
                prev, cur = cur, nxt[0]
                chain.append(cur)
            if cur in junction:
                used.add((cur, chain[-2]))
                used.add((j, first))
                edges.append((cluster[j], cluster[cur], chain))
    if not junction:  # a clean ring: walk it
        p0 = next(iter(pts))
        chain, seen = [p0], {p0}
        while True:
            nxt = [r for r in nbrs(chain[-1]) if r not in seen]
            if not nxt:
                break
            chain.append(nxt[0])
            seen.add(nxt[0])
        order = chain
    else:
        plen = lambda c: float(np.sum(np.hypot(*np.diff(np.array(c, float), axis=0).T)))
        best = (0, None)

        def dfs(node, startn, used_e, path, length):
            global best
            for k, (u, v, c) in enumerate(edges):
                if k in used_e or node not in (u, v):
                    continue
                other = v if node == u else u
                cc = c if node == u else c[::-1]
                if other == startn:
                    if length + plen(cc) > best[0]:
                        best = (length + plen(cc), path + [cc])
                elif other not in visited:
                    visited.add(other)
                    dfs(other, startn, used_e | {k}, path + [cc], length + plen(cc))
                    visited.discard(other)

        for n0 in set(cluster.values()):
            visited = {n0}
            dfs(n0, n0, frozenset(), [], 0.0)
        if not best[1]:
            raise SystemExit("no cycle in the skeleton; check mask.png")
        order = [p for c in best[1] for p in c]
    loop = np.array(order, float)
    if len(loop) < 200:
        raise SystemExit(f"the longest loop is only {len(loop)}px: the ring is broken somewhere; check mask.png (raise --close or --tol)")

# smooth + resample to 1px
def resample(poly, step):
    keep = np.r_[True, np.hypot(*np.diff(poly, axis=0).T) > 1e-6]  # drop repeated points
    poly = poly[keep]
    closedp = np.vstack([poly, poly[:1]])
    seg = np.hypot(*np.diff(closedp, axis=0).T)
    s = np.concatenate([[0], np.cumsum(seg)])
    t = np.arange(0, s[-1] - step / 2, step)
    return np.stack([np.interp(t, s, closedp[:, 0]), np.interp(t, s, closedp[:, 1])], 1)


loop = resample(loop, 1.0)
# light smoothing: a wide kernel pulls the line inside on tight hairpins
kern = np.ones(args.smooth) / args.smooth
pad = args.smooth // 2
loop = np.stack([np.convolve(np.r_[loop[-pad:, i], loop[:, i], loop[:pad, i]], kern, "valid") for i in (0, 1)], 1)
if args.waypoints:  # round off the corners of the hand-drawn route before snapping it
    k31 = np.ones(31) / 31
    loop = np.stack([np.convolve(np.r_[loop[-15:, i], loop[:, i], loop[:15, i]], k31, "valid") for i in (0, 1)], 1)
loop = resample(loop, 1.0)
N = len(loop)

# orientation: travel from start towards ahead
i0 = int(np.argmin(np.hypot(*(loop - start).T)))
loop = np.roll(loop, -i0, axis=0)
ia = int(np.argmin(np.hypot(*(loop - ahead).T)))
if ia > N / 2:
    loop = np.roll(loop[::-1], 1, axis=0)

def normals(loop):
    tan = np.roll(loop, -3, axis=0) - np.roll(loop, 3, axis=0)
    tan /= np.hypot(*tan.T)[:, None]
    return np.stack([-tan[:, 1], tan[:, 0]], 1)  # right of travel (y down)


def circular_smooth(values, window):
    pad = window // 2
    k = np.ones(window) / window
    return np.convolve(np.r_[values[-pad:], values, values[:pad]], k, "valid")


normal = normals(loop)
if args.waypoints:
    # Snap the hand-drawn route to the middle of the asphalt: across the track at
    # each point, find the run of asphalt nearest the route and move to its middle.
    # Where there's no clean run (a tunnel wall, a car) the route stays as drawn.
    reach = args.reach * scale
    offs_all = np.arange(-reach, reach + 0.5, 0.5)
    found = {}
    for i in range(N):
        on = np.array([track[int(round(y)), int(round(x))] if 0 <= int(round(x)) < W and 0 <= int(round(y)) < H else False for x, y in (loop[i] + normal[i] * offs_all[:, None])])
        if not on.any():
            continue
        # runs of asphalt along the cross-section
        edges = np.flatnonzero(np.diff(np.r_[0, on.astype(int), 0]))
        runs = [(offs_all[a], offs_all[b - 1]) for a, b in zip(edges[::2], edges[1::2])]
        lo, hi = min(runs, key=lambda r: 0 if r[0] <= 0 <= r[1] else min(abs(r[0]), abs(r[1])))
        found[i] = (lo, hi)
    # Keep only cross-sections about as wide as the track: narrower ones hit a hole,
    # wider ones ran into dark rock or a neighbouring stretch.
    typical = float(np.median([hi - lo for lo, hi in found.values()])) if found else 0
    shift = np.zeros(N)
    good = np.zeros(N, bool)
    widths = []
    for i, (lo, hi) in found.items():
        if 0.75 * typical <= hi - lo <= 1.25 * typical:
            shift[i] = (lo + hi) / 2
            widths.append(hi - lo)
            good[i] = True
    # fill the gaps and keep the shift gentle
    idx = np.flatnonzero(good)
    if len(idx) > 2:
        shift = np.interp(np.arange(N), np.r_[idx - N, idx, idx + N], np.r_[shift[idx], shift[idx], shift[idx]])
    shift = circular_smooth(shift, 41)
    loop = loop + normal * shift[:, None]
    loop = resample(loop, 1.0)
    loop = np.stack([circular_smooth(loop[:, i], 15) for i in (0, 1)], 1)
    loop = resample(loop, 1.0)
    N = len(loop)
    i0 = int(np.argmin(np.hypot(*(loop - start).T)))
    loop = np.roll(loop, -i0, axis=0)
    normal = normals(loop)
    half = round(float(np.median(widths)) / 2 * 0.92) if widths else 20
    print(f"snapped {good.mean():.0%} of the route to the asphalt")
else:
    half = float(np.median([dt[int(round(y)), int(round(x))] for x, y in loop if 0 <= int(y) < H and 0 <= int(x) < W]))
    half = round(half * 0.92)

# 3. Divider score: share of a cross-section that is white or orange
line = (white | orange).astype(float)
line = cv2.dilate(line, np.ones((2, 2), np.uint8))


def sample(arr, x, y):
    xi, yi = int(round(x)), int(round(y))
    return arr[yi, xi] if 0 <= xi < W and 0 <= yi < H else 0


offs = np.linspace(-half * 0.85, half * 0.85, 25)
score = np.array([np.mean([sample(line, *(loop[i] + normal[i] * o)) for o in offs]) for i in range(N)])
score = np.maximum.reduce([np.roll(score, d) for d in (-1, 0, 1)])

# peaks
cands = [i for i in range(N) if score[i] >= args.line_score and score[i] == max(score[(i + d) % N] for d in range(-4, 5))]
# rough spacing from the strongest peaks, then non-max suppression
cands.sort(key=lambda i: -score[i])
guess = N / (args.spaces or max(len(cands), 1))
picked = []
for i in cands:
    if all(min(abs(i - j), N - abs(i - j)) > guess * args.min_gap for j in picked):
        picked.append(i)
picked.sort()
# the start/finish line is divider 0: the peak nearest index 0
z = min(range(len(picked)), key=lambda k: min(picked[k], N - picked[k]))
picked = picked[z:] + picked[:z]
gaps = [(picked[(k + 1) % len(picked)] - picked[k]) % N for k in range(len(picked))]
med = float(np.median(gaps))

# A space about twice as long as the rest is missing a divider (a faint or
# odd-coloured line): split it at the best-scoring points near equal shares.
split = []
for k, g in enumerate(gaps):
    parts = round(g / med)
    a = picked[k]
    split.append(a)
    if parts >= 2 and g / med > 1.6:
        for j in range(1, parts):
            target = a + g * j / parts
            window = [int(target + d) % N for d in range(-int(med * 0.2), int(med * 0.2) + 1)]
            best_i = max(window, key=lambda i: score[i])
            split.append(best_i)
            print(f"split space {k} ({g}px): added a divider at {loop[best_i].round(0).tolist()} (score {score[best_i]:.2f})")
picked = split
if args.drop:  # fake dividers seen in debug.png (a car's outline across the track), by index
    drop = {int(i) for i in args.drop.split(",")}
    picked = [p for k, p in enumerate(picked) if k not in drop]
if args.add:  # dividers the score missed or misplaced (tight hairpins), as x,y;x,y in traced pixels
    for xy in args.add.split(";"):
        x, y = map(float, xy.split(","))
        i = int(np.argmin(np.hypot(*(loop - (x, y)).T)))
        print(f"added a divider at {loop[i].round(0).tolist()}")
        picked.append(i)
    z0 = picked[0]
    picked = sorted(picked, key=lambda i: (i - z0) % N)
gaps = [(picked[(k + 1) % len(picked)] - picked[k]) % N for k in range(len(picked))]

# 4. Racing line: thicker white border. Count white pixels just outside each edge.
def border(i, sign):
    return sum(sample(white.astype(float), *(loop[i] + normal[i] * sign * o)) for o in np.arange(half * 0.8, half * 1.6, 0.5))


def mid(k):
    a, b = picked[k], picked[(k + 1) % len(picked)]
    return (a + ((b - a) % N) // 2) % N


sides = []
for k in range(len(picked)):
    a, b = picked[k], picked[(k + 1) % len(picked)]
    idx = [(a + j) % N for j in range(2, (b - a) % N - 1)]
    r = sum(border(i, 1) for i in idx)
    l = sum(border(i, -1) for i in idx)
    sides.append("right" if r >= l else "left")

r1 = lambda v: round(float(v), 1)
anchor = lambda i: [r1(loop[i][0]), r1(loop[i][1]), r1(math.degrees(math.atan2(normal[i][1], normal[i][0])))]
step = 12
path = "M" + " L".join(f"{r1(x)} {r1(y)}" for x, y in loop[::step]) + " Z"
path = path.replace(".0 ", " ").replace(".0 L", " L")
geometry = {
    "width": W,
    "height": H,
    "halfWidth": half,
    "path": path,
    "dividers": [anchor(i) for i in picked],
    "spaces": [anchor(mid(k)) for k in range(len(picked))],
    "badges": [],
}
json.dump(geometry, open(os.path.join(args.out, "geometry.json"), "w"))

# 5. Debug render
big = 2
dbg = img.resize((W * big, H * big)).convert("RGB")
d = ImageDraw.Draw(dbg)
d.line([tuple(p * big) for p in loop[::4]], fill=(255, 0, 255), width=1)
for k, i in enumerate(picked):
    p, nrm = loop[i], normal[i]
    a, b = (p - nrm * half) * big, (p + nrm * half) * big
    d.line([tuple(a), tuple(b)], fill=(255, 0, 0) if k else (0, 255, 0), width=2)
    q = loop[mid(k)] * big
    d.text((q[0] - 6, q[1] - 6), str(k), fill=(255, 255, 0))
    e = (loop[mid(k)] + normal[mid(k)] * (half + 8) * (1 if sides[k] == "right" else -1)) * big
    d.text(tuple(e), sides[k][0].upper(), fill=(0, 255, 255))
dbg.save(os.path.join(args.out, "debug.png"))

lines = [
    f"scale {scale:.4f} (original → traced), traced at {W}x{H}, halfWidth {half}",
    f"dividers found: {len(picked)}" + (f" (card says {args.spaces})" if args.spaces else ""),
    f"median spacing {med:.1f}px",
]
for k, g in enumerate(gaps):
    if g > med * 1.45 or g < med * 0.6:
        lines.append(f"  space {k}: length {g}px ({g / med:.2f}× median) — missing or extra divider?")
if args.corners:
    cs = [int(c) for c in args.corners.split(",")]
    for n, c in enumerate(cs):
        end = cs[(n + 1) % len(cs)]
        ks = [k % len(picked) for k in range(c, end if end > c else end + len(picked))]
        r = sum(sides[k] == "right" for k in ks)
        lines.append(f"stretch after corner line {c}: {r}/{len(ks)} spaces look right → {'right' if r * 2 >= len(ks) else 'left'}")
lines.append("racing line by space: " + " ".join(f"{k}:{s[0].upper()}" for k, s in enumerate(sides)))
open(os.path.join(args.out, "report.txt"), "w").write("\n".join(lines) + "\n")
print("\n".join(lines))
