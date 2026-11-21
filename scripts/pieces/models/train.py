# Al Boraq, Morocco's high-speed train: one streamlined power car with a long sloping nose, a dark wraparound
# windscreen, a row of side windows, the red and green stripes of its livery, a pantograph and two bogies.
LOOK_Z, WIDTH = 0.6, 3.5

X0, XS, XT = -1.18, 0.1, 1.32                        # the rear end, where the nose begins, the tip of the nose
W, ZB, ZR, ZL = 0.29, G + 0.2, G + 0.8, G + 0.38     # half width, underside, roof, the top of the nose at its tip
# heights up the side (-1 the underside, 1 the roof) where every ring has a point, so paint edges fall on them
SIDE = [-0.86, -0.72, -0.6, -0.46, -0.4, -0.26, -0.12, 0.0, 0.2, 0.4, 0.6, 0.74, 0.86]
CAP = 9                                              # points across the roof, and across the underside
RED, GREEN = (-0.4, -0.12), (-0.72, -0.46)          # the stripes, as heights up the side
SCREEN, SCREEN_U = 0.4, (0.14, 0.52)                 # the windscreen: above this height, over this stretch of nose
NOSE_U = [0.0, 0.07, 0.14, 0.24, 0.34, 0.43, 0.52, 0.61, 0.7, 0.78, 0.85, 0.9, 0.94, 0.97, 0.99, 1.0]


def loft(rings, mat_of, mats, name, cap_start=False):
    """a smooth skin through `rings` of points (each a closed loop, all of one length); a ring that shrinks to a
    point or a line closes that end. mat_of(i, k) picks the material between rings i, i+1 and points k, k+1"""
    bm = bmesh.new()
    seen = {}

    def vert(p):
        key = tuple(round(c, 5) for c in p)
        if key not in seen:
            seen[key] = bm.verts.new(p)
        return seen[key]

    vs = [[vert(p) for p in r] for r in rings]
    n = len(rings[0])
    for i in range(len(rings) - 1):
        for k in range(n):
            face = []
            for v in (vs[i][k], vs[i][(k + 1) % n], vs[i + 1][(k + 1) % n], vs[i + 1][k]):
                if v not in face:
                    face.append(v)
            if len(face) < 3:
                continue
            try:
                f = bm.faces.new(face)
            except ValueError:
                continue
            f.material_index = mat_of(i, k)
            f.smooth = True
    if cap_start:
        cap = []
        for v in vs[0]:
            if v not in cap:
                cap.append(v)
        bm.faces.new(cap).material_index = mat_of(0, 0)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    for e in bm.edges:                                   # crisp where the skin folds sharply
        if len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(45):
            e.smooth = False
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    return o


def section(x):
    """half width, middle height, half height and squareness of the body's cross-section at x"""
    if x < XS:
        r = min(1.0, (x - X0) / 0.08)                    # the rounded rear end
        f = math.sqrt(max(0.0, 1 - (1 - r) ** 2))
        return W * f, (ZR + ZB) / 2, (ZR - ZB) / 2 * f, 5.0
    u = min(1.0, (x - XS) / (XT - XS))
    zt = ZL + (ZR - ZL) * (1 - u) ** 1.25 * (1 + 1.25 * u)      # the roof line sloping down the nose
    f = math.sqrt(max(0.0, 1 - u ** 4))                         # rounds off the tip
    return W * math.sqrt(max(0.0, 1 - u ** 2)), (zt + ZB) / 2, (zt - ZB) / 2 * f, 5.0 - 2.5 * u


def side_t(v, n):
    return math.asin(math.copysign(abs(v) ** (n / 2), v))


def ring(x):
    hw, zc, hh, n = section(x)

    def at(t):
        c, s = math.cos(t), math.sin(t)
        return (x, hw * math.copysign(abs(c) ** (2 / n), c), zc + hh * math.copysign(abs(s) ** (2 / n), s))

    ts = [side_t(v, n) for v in SIDE]
    lo, hi = ts[0], ts[-1]
    top = [hi + (math.pi - 2 * hi) * (j + 1) / (CAP + 1) for j in range(CAP)]
    bottom = [math.pi - lo + (math.pi + 2 * lo) * (j + 1) / (CAP + 1) for j in range(CAP)]
    return [at(t) for t in ts + top + [math.pi - t for t in reversed(ts)] + bottom]


def surface(x, v, sy):
    """the point on the body's side at x, height v, on side sy (-1 the front-facing side)"""
    hw, zc, hh, n = section(x)
    return (x, sy * hw * math.cos(side_t(v, n)) ** (2 / n), zc + hh * v)


def make():
    before = set(bpy.context.scene.objects)
    p = pewter()
    glass = mat('Glass', '#10161f', 0.08, coat=1.0)
    dark = mat('Underframe', '#2a2c31', 0.5)
    label = SIDE + [1.0] * CAP + list(reversed(SIDE)) + [-1.0] * CAP
    n = len(label)

    stations = [(X0 + 0.08 * r, None) for r in (0.0, 0.06, 0.16, 0.3, 0.48, 0.7, 0.88, 1.0)]
    stations += [(-0.5, None), (-0.1, None)]
    stations += [(XS + u * (XT - XS), u) for u in NOSE_U]

    def mat_of(i, k):
        a, b = label[k], label[(k + 1) % n]
        lo, hi = min(a, b), max(a, b)
        ua, ub = stations[i][1], stations[i + 1][1]
        if ua is not None and ub is not None and ua >= SCREEN_U[0] - 1e-6 and ub <= SCREEN_U[1] + 1e-6 \
                and lo >= SCREEN - 1e-6:
            return 3
        if lo >= RED[0] - 1e-6 and hi <= RED[1] + 1e-6:
            return 1
        if lo >= GREEN[0] - 1e-6 and hi <= GREEN[1] + 1e-6:
            return 2
        return 0

    loft([ring(x) for x, _ in stations], mat_of,
         [p, enamel('Red', '#c1272d'), enamel('Green', '#17a862'), glass], 'Body')

    zc = (ZR + ZB) / 2
    for sy in (-1, 1):
        for j in range(6):                                                    # side windows
            box((0.12, 0.04, 0.14), (-0.92 + j * 0.17, sy * W, zc + 0.09), glass, bevel=0.012)
        ball(0.05, surface(XS + 0.8 * (XT - XS), 0.02, sy), mat('Lamp', '#fff4c2', 0.1), scale=(0.9, 0.8, 0.6))
    box((1.75, 0.42, 0.18), (-0.13, 0, G + 0.14), dark, bevel=0.02)          # underframe between the bogies
    for bx in (-0.7, 0.4):                                                    # two bogies of two axles
        for ax in (-0.15, 0.15):
            for sy in (-1, 1):
                cyl(0.1, 0.06, (bx + ax, sy * 0.235, G + 0.1), p, bevel=0.015, rot=(90, 0, 0))
        for sy in (-1, 1):
            box((0.46, 0.04, 0.07), (bx, sy * 0.275, G + 0.11), p, bevel=0.015)
    box((0.34, 0.22, 0.04), (-0.72, 0, ZR + 0.005), p, bevel=0.01)          # pantograph: a frame on the roof,
    tube([(-0.86, 0, ZR + 0.04), (-0.52, 0, ZR + 0.13)], brass(), radius=0.02)   # two folding arms
    tube([(-0.52, 0, ZR + 0.13), (-0.74, 0, ZR + 0.22)], brass(), radius=0.02)
    box((0.05, 0.36, 0.03), (-0.74, 0, ZR + 0.23), brass(), bevel=0.01)     # and the bar that touches the wire
    # less turned than the taxi: a long nose pointed further toward the camera looks short and stubby
    turn_all([o for o in bpy.context.scene.objects if o not in before], -6)
