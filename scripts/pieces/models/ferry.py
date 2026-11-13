# The Tangier ferry: a chunky passenger ferry with a raked bow and a red stripe along the hull, two tiers of windows
# under a bridge with wings, a funnel with a red band and a small mast.
LOOK_Z, WIDTH = 0.9, 4.0

XA, XF, XB = -1.0, 0.25, 1.3          # the stern, where the bow begins to narrow, the tip of the bow
HW = 0.42                             # half the hull's width
BAND = (G + 0.1, G + 0.18)            # the red stripe along the hull: in each ring, between points 5 and 6 (16 and 17)
BOW_U = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.78, 0.85, 0.91, 0.95, 0.98, 1.0]


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


def hull_ring(x):
    """the hull's cross-section at x: keel, bilge, flared side, bulwark and the deck inside it"""
    u = max(0.0, (x - XF) / (XB - XF))
    hw = HW * max(0.0, 1 - u ** 1.8) ** 0.9                     # in plan, the bow comes to a point
    zr = G + 0.52 + 0.1 * u ** 2                                # the sheer rises toward the bow
    w = max(0.0, (x - 0.35) / (XB - 0.35))
    zb = G - 0.005 + (zr - 0.025 - G) * w ** 2                  # the forefoot curves up into the stem
    t = min(0.04, hw * 0.3)                                     # bulwark thickness
    zd = zr - min(0.06, (zr - zb) * 0.5)                        # the deck
    rb = min(0.08, hw * 0.45, (zr - zb) * 0.45)                 # bilge radius
    hb = hw * 0.9                                               # flare: narrower at the keel than at the deck
    right = [(hb - rb + rb * math.cos(math.radians(a)), zb + rb + rb * math.sin(math.radians(a)))
             for a in (-90, -60, -30, 0)]
    z0 = zb + rb

    def side(z):                                                # the flared side, from the bilge up to the rim
        return (hb + (hw - hb) * (z - z0) / (zr - z0) if zr > z0 else hw, z)

    lo = min(max(BAND[0], z0), zr)
    hi = min(max(BAND[1], lo), zr)
    right += [side(lo), side(hi), side((hi + zr) / 2), (hw, zr), (hw - t, zr), (hw - t, zd)]
    loop = [(0.0, zb)] + right + [(0.0, zd)] + [(-y, z) for y, z in reversed(right)]
    return [(x, y, z) for y, z in loop]


def raked(size, at, m, rake, bevel=0.03):
    """a deckhouse: a block whose front leans back by `rake` at the top"""
    o = box(size, at, m, bevel=bevel)
    return taper_top(o, (size[0] - rake) / size[0], 1, shift=(-rake / 2, 0))


def make():
    before = set(bpy.context.scene.objects)
    p = pewter()
    glass = mat('Glass', '#10161f', 0.08, coat=1.0)
    red = enamel('Red', '#c1272d')
    xs = [XA, XA + 0.03, -0.6, -0.2, 0.1] + [XF + u * (XB - XF) for u in BOW_U]
    loft([hull_ring(x) for x in xs], lambda i, k: 1 if k in (5, 16) else 0, [p, red], 'Hull', cap_start=True)

    # the lower deckhouse, the upper one, and the bridge with its wings
    raked((1.3, 0.8, 0.32), (-0.23, 0, G + 0.6), p, 0.08)
    raked((0.96, 0.7, 0.28), (-0.3, 0, G + 0.88), p, 0.06)
    box((0.3, 0.84, 0.22), (0.07, 0, G + 1.11), p, bevel=0.025)
    box((0.36, 0.6, 0.03), (0.07, 0, G + 1.23), p, bevel=0.01)                # bridge roof

    for sy in (-1, 1):                                                        # windows along the sides
        for j in range(7):
            box((0.11, 0.03, 0.12), (-0.78 + j * 0.17, sy * 0.4, G + 0.62), glass, bevel=0.01)
        for j in range(6):
            box((0.1, 0.03, 0.11), (-0.68 + j * 0.15, sy * 0.35, G + 0.88), glass, bevel=0.01)
        box((0.16, 0.03, 0.07), (0.07, sy * 0.42, G + 1.13), glass, bevel=0.01)
    for y in (-0.27, -0.09, 0.09, 0.27):                                      # windows across the fronts
        g = box((0.03, 0.12, 0.1), (0.375, y, G + 0.62), glass, bevel=0.01)
        g.rotation_euler = (0, math.radians(-14), 0)
    for y in (-0.2, 0.0, 0.2):
        g = box((0.03, 0.12, 0.1), (0.15, y, G + 0.88), glass, bevel=0.01)
        g.rotation_euler = (0, math.radians(-12), 0)
    box((0.03, 0.72, 0.08), (0.22, 0, G + 1.13), glass, bevel=0.01)          # the bridge's long window

    # the funnel, leaning back, with a red band and a dark mouth
    lean = math.radians(-8)
    axis = Vector((math.sin(lean), 0, math.cos(lean)))
    foot = Vector((-0.52, 0, G + 1.0))
    for s, r1, r2, depth, m in ((0.25, 0.15, 0.125, 0.5, p), (0.37, 0.15, 0.145, 0.1, red),
                                (0.5, 0.11, 0.11, 0.03, mat('Soot', '#1b1c1f', 0.6))):
        o = cyl(r1, depth, tuple(foot + axis * s), m, rot=(0, -8, 0), radius2=r2)
        o.scale = (1.3, 0.85, 1)

    cyl(0.022, 0.44, (0.07, 0, G + 1.44), p)                                  # mast, yard and a brass light
    box((0.03, 0.3, 0.025), (0.07, 0, G + 1.52), p, bevel=0.008)
    ball(0.04, (0.07, 0, G + 1.68), brass())
    # less turned than the taxi: a long hull pointed further toward the camera looks short and stubby
    turn_all([o for o in bpy.context.scene.objects if o not in before], -6)
