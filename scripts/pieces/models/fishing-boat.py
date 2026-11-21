# A blue fishing boat of Essaouira: a round-bilged wooden hull in blue enamel rising to a raked, pointed bow, with a
# pewter gunwale, keel and stem, a deck, a small wheelhouse aft and a short mast.
LOOK_Z, WIDTH = 0.75, 3.7

XS, XB = -1.12, 1.08      # the stern, and the foot of the stem
LIFT = 0.08               # how far the hull bottom stands off the base: the keel fills the gap
DECK = 0.48               # the deck, above the base


def beam(u):
    """half the hull's width at the sheer, `u` of the way from stern to bow"""
    if u <= 0.38:
        return 0.38 + 0.12 * math.sin(u / 0.38 * math.pi / 2)
    t = (u - 0.38) / 0.62
    return 0.5 * max(0.0, 1 - t ** 1.5)


def sheer(u):
    if u <= 0.45:
        return 0.6 + 0.08 * (1 - u / 0.45) ** 2
    return 0.6 + 0.58 * ((u - 0.45) / 0.55) ** 2.4


def keel(u):
    if u < 0.12:
        return LIFT + 0.08 * (1 - u / 0.12) ** 2
    if u <= 0.65:
        return LIFT
    return LIFT + 0.42 * ((u - 0.65) / 0.35) ** 2


def full(u):
    """how round the bilge is: under 1 a flat-bottomed U, over 1 a V"""
    return 0.7 + 0.9 * max(0.0, (u - 0.5) / 0.5) ** 1.5


def rake(u):
    t = max(0.0, (u - 0.7) / 0.3)
    return 0.35 * t * t * (3 - 2 * t)


def hull_x(u, z):
    return XS + (XB - XS) * u + rake(u) * (z - keel(u))


def hull_point(u, phi):
    b, s, k, p = beam(u), sheer(u), keel(u), full(u)
    z = k + (s - k) * (1 - abs(math.cos(phi)) ** p)
    return Vector((hull_x(u, z), b * math.sin(phi), G + z))


def half_width(u, z):
    """the hull's half width at height z above the base, or None below the keel"""
    b, s, k, p = beam(u), sheer(u), keel(u), full(u)
    if z <= k:
        return None
    if z >= s:
        return b
    c = (1 - (z - k) / (s - k)) ** (1 / p)
    return b * math.sin(math.acos(c))


def hull(m):
    NX, M = 64, 24
    bm = bmesh.new()
    rings = [[bm.verts.new(hull_point(i / NX, -math.pi / 2 + math.pi * j / M)) for j in range(M + 1)]
             for i in range(NX + 1)]
    for i in range(NX):
        for j in range(M):
            bm.faces.new((rings[i][j], rings[i][j + 1], rings[i + 1][j + 1], rings[i + 1][j]))
    transom = bm.faces.new(list(reversed(rings[0])))
    for f in bm.faces:
        f.smooth = f is not transom
    for e in transom.edges:
        e.smooth = False
    me = bpy.data.meshes.new('Hull')
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new('Hull', me)
    bpy.context.scene.collection.objects.link(o)
    s = o.modifiers.new('Planks', 'SOLIDIFY')
    s.thickness = 0.04
    s.offset = -1
    s.use_even_offset = True
    o.data.materials.append(m)
    return o


def deck(z, u0, u1, m, thick=0.04, inset=0.02):
    """a flat deck laid inside the hull at height z, its edges buried in the planking"""
    n = 40
    us = [u0 + (u1 - u0) * i / n for i in range(n + 1)]
    us = [u for u in us if (half_width(u, z - thick) or 0) - inset > 0.01]     # where even the underside fits
    bm = bmesh.new()
    layers = []
    for zz in (z, z - thick):
        port, star = [], []
        for i, u in enumerate(us):
            w = half_width(u, zz)
            x = hull_x(u, zz) + (inset if u == 0 else 0)
            port.append(bm.verts.new((x, -(w - inset), G + zz)))
            star.append(bm.verts.new((x, w - inset, G + zz)))
        layers.append(port + star[::-1])
    top, bottom = layers
    bm.faces.new(top)
    bm.faces.new(bottom[::-1])
    k = len(top)
    for i in range(k):
        bm.faces.new((bottom[i], bottom[(i + 1) % k], top[(i + 1) % k], top[i]))
    bm.normal_update()
    me = bpy.data.meshes.new('Deck')
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new('Deck', me)
    bpy.context.scene.collection.objects.link(o)
    o.data.materials.append(m)
    return o


def make():
    p = pewter()
    blue = enamel('Boat blue', '#2f8fd8')
    glass = mat('Glass', '#10161f', 0.08, coat=1.0)
    before = set(bpy.context.scene.objects)

    hull(blue)
    deck(DECK, 0.0, 1.0, p)
    # gunwale: a pewter rail along each side and across the transom
    for side in (-1, 1):
        tube([tuple(hull_point(i / 40, side * math.pi / 2)) for i in range(41)], p, radius=0.045)
    b0, s0 = beam(0), sheer(0)
    tube([(XS, -b0, G + s0), (XS, 0, G + s0), (XS, b0, G + s0)], p, radius=0.045)
    for side in (-1, 1):                                                  # a rubbing strake lower down each side
        tube([tuple(hull_point(i / 40 * 0.96, side * math.radians(64))) for i in range(41)], p, radius=0.025)
    # keel and stem: one pewter bar under the hull and up the bow, standing a little above the gunwale
    prof = [(hull_x(i / 40, keel(i / 40)), 0, G + keel(i / 40) - 0.034) for i in range(41)]
    k1, s1 = keel(1), sheer(1)
    prof += [(XB + 0.35 * (z - k1), 0, G + z) for z in (k1 + 0.1, (k1 + s1) / 2, s1, s1 + 0.08)]
    tube(prof, p, radius=0.05)

    # the wheelhouse, toward the stern
    wx, wl, ww, wh = -0.66, 0.48, 0.56, 0.5
    box((wl, ww, wh), (wx, 0, G + DECK + wh / 2), p, bevel=0.03)
    box((wl + 0.12, ww + 0.12, 0.06), (wx, 0, G + DECK + wh + 0.03), p, bevel=0.02)          # roof
    for y in (-0.12, 0.12):                                                                  # front windows
        box((0.04, 0.17, 0.16), (wx + wl / 2 + 0.003, y, G + DECK + wh - 0.15), glass, bevel=0.01)
    for side in (-1, 1):                                                                     # side windows
        box((0.24, 0.04, 0.16), (wx + 0.02, side * (ww / 2 + 0.003), G + DECK + wh - 0.15), glass, bevel=0.01)
    ball(0.06, (wx - 0.08, 0, G + DECK + wh + 0.1), brass())                                 # lamp on the roof

    for r, z in ((0.1, 0.027), (0.075, 0.085)):                            # a coil of rope on deck
        torus(r, 0.035, (0.0, 0.14, G + DECK + z), p)
    # a short mast forward, with a brass ball on top
    mx = 0.3
    cyl(0.04, 1.2, (mx, 0, G + DECK + 0.6), p, radius2=0.028)
    cyl(0.07, 0.05, (mx, 0, G + DECK + 0.025), p, bevel=0.01)
    ball(0.06, (mx, 0, G + DECK + 1.22), brass())
    top = G + DECK + 1.12                                                 # a little red pennant flying aft
    bm = bmesh.new()
    vs = [bm.verts.new((x, y, z)) for y in (-0.014, 0.014)
          for x, z in ((mx - 0.02, top), (mx - 0.02, top - 0.22), (mx - 0.36, top - 0.11))]
    bm.faces.new(vs[:3][::-1])
    bm.faces.new(vs[3:])
    for i in range(3):
        bm.faces.new((vs[i], vs[(i + 1) % 3], vs[3 + (i + 1) % 3], vs[3 + i]))
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    me = bpy.data.meshes.new('Pennant')
    bm.to_mesh(me)
    bm.free()
    flag = bpy.data.objects.new('Pennant', me)
    bpy.context.scene.collection.objects.link(flag)
    finish(flag, enamel('Flag red', '#c1272d'), bevel=0.008)

    # turned a little less than the taxi's -18 degrees, so the rising sheer and the raked bow show in profile
    turn_all([o for o in bpy.context.scene.objects if o not in before], -8)
