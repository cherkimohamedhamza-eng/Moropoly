# A dromedary standing: one hump under a red saddle cloth edged in brass, a long neck curving up to a small head.
# The animal is a cluster of metaballs (blended ellipsoids and rows of balls) turned into one smooth mesh, so it
# reads as cast in one piece.
LOOK_Z, WIDTH = 1.3, 4.0

from mathutils import Quaternion
from mathutils.bvhtree import BVHTree

LONE, ROW = 0.575, 0.714      # how much of its radius a metaball shows: on its own, and in a close row of them


def _element(mb, at, radius, half=None, tilt=0.0):
    e = mb.elements.new(type='ELLIPSOID' if half else 'BALL')
    e.co = at
    e.radius = radius
    if half:
        e.size_x, e.size_y, e.size_z = half
    if tilt:
        e.rotation = Quaternion((0, 1, 0), math.radians(tilt))
    return e


def lump(mb, at, half, tilt=0.0):
    """an ellipsoid with these half-lengths, tilted `tilt` degrees nose-down"""
    _element(mb, at, 1 / LONE, half, tilt)


def limb(mb, points, radii):
    """a smooth rod of metaballs through `points`, `radii` thick at each"""
    P = [Vector(q) for q in points]
    P = [2 * P[0] - P[1]] + P + [2 * P[-1] - P[-2]]
    dense = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1:i + 3]
        for k in range(30):
            t = k / 30
            c = 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t
                       + (3 * p1 - p0 - 3 * p2 + p3) * t ** 3)
            dense.append((c, radii[i - 1] + (radii[i] - radii[i - 1]) * t))
    dense.append((P[-2], radii[-1]))
    walked, prev = 1e9, None
    for c, r in dense:
        if prev is not None:
            walked += (c - prev).length
        prev = c
        if walked >= r / ROW / 4:
            _element(mb, c, r / ROW)
            walked = 0
    _element(mb, dense[-1][0], dense[-1][1] / ROW)


def to_mesh(ob):
    for o in bpy.context.selected_objects:
        o.select_set(False)
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.convert(target='MESH')
    return bpy.context.active_object


def blanket(camel, x0, x1, centre_z, reach, m, trim):
    """a saddle cloth laid over the hump: rays from inside the body find its skin, the cloth sits just outside it
    and hangs straight down the flanks; brass cord round its edge and tassels along the bottom"""
    tree = BVHTree.FromObject(camel, bpy.context.evaluated_depsgraph_get())
    nx, na = 22, 40
    rows = []
    for i in range(nx + 1):
        x = x0 + (x1 - x0) * i / nx
        row = [None] * (na + 1)
        mid = na // 2
        for side in (1, -1):
            widest = 0.0
            for k in range(mid + 1):
                j = mid + side * k
                a = side * reach * k / mid
                d = Vector((0, math.sin(a), math.cos(a)))
                hit = tree.ray_cast(Vector((x, 0, centre_z)), d)[0]
                q = hit + d * 0.035
                if abs(q.y) >= widest:
                    widest = abs(q.y)
                else:
                    q.y = side * widest            # below the widest point the cloth hangs straight
                row[j] = q
        rows.append(row)
    bm = bmesh.new()
    vs = [[bm.verts.new(q) for q in row] for row in rows]
    for i in range(nx):
        for j in range(na):
            bm.faces.new((vs[i][j], vs[i + 1][j], vs[i + 1][j + 1], vs[i][j + 1]))
    bm.normal_update()
    bm.faces.ensure_lookup_table()
    f = bm.faces[(nx // 2) * na + na // 2]
    if f.normal.z < 0:
        bmesh.ops.reverse_faces(bm, faces=list(bm.faces))
    me = bpy.data.meshes.new('Blanket')
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new('Blanket', me)
    bpy.context.scene.collection.objects.link(o)
    s = o.modifiers.new('Thick', 'SOLIDIFY')
    s.thickness = 0.055
    s.offset = -1
    finish(o, m, smooth=True)
    edges = [[r[0] for r in rows], [r[-1] for r in rows], rows[0], rows[-1]]
    for e in edges:
        tube([tuple(q) for q in e], trim, radius=0.024)
    for e in edges[:2]:
        for q in (e[1], e[nx // 2], e[-2]):
            tube([tuple(q), tuple(q - Vector((0, 0, 0.08)))], trim, radius=0.014)
            ball(0.04, tuple(q - Vector((0, 0, 0.1))), trim, scale=(1, 1, 1.3))


def make():
    p = pewter()
    before = set(bpy.context.scene.objects)
    mb = bpy.data.metaballs.new('Camel')
    mb.resolution = mb.render_resolution = 0.022
    ob = bpy.data.objects.new('Camel', mb)
    bpy.context.scene.collection.objects.link(ob)

    lump(mb, (-0.12, 0, G + 1.2), (0.52, 0.29, 0.28))            # barrel
    lump(mb, (0.26, 0, G + 1.18), (0.26, 0.27, 0.29))             # chest
    lump(mb, (-0.52, 0, G + 1.2), (0.26, 0.26, 0.26))             # rump
    lump(mb, (-0.14, 0, G + 1.5), (0.3, 0.21, 0.3))               # hump
    lump(mb, (-0.12, 0, G + 1.66), (0.24, 0.17, 0.14))            # its peak
    for y in (-0.16, 0.16):
        limb(mb, [(0.26, y, G + 1.0), (0.26, y, G + 0.5), (0.27, y, G + 0.1)], [0.14, 0.09, 0.08])   # forelegs
        lump(mb, (0.26, y, G + 0.5), (0.115, 0.11, 0.12))                                           # knees
        lump(mb, (0.31, y, G + 0.05), (0.15, 0.115, 0.055))                                              # feet
        limb(mb, [(-0.5, y, G + 1.05), (-0.54, y, G + 0.76), (-0.61, y, G + 0.48), (-0.57, y, G + 0.1)],
             [0.15, 0.105, 0.085, 0.08])                                                               # hind legs
        lump(mb, (-0.61, y, G + 0.48), (0.11, 0.105, 0.115))                                               # hocks
        lump(mb, (-0.53, y, G + 0.05), (0.15, 0.115, 0.055))
    limb(mb, [(0.38, 0, G + 1.32), (0.66, 0, G + 1.28), (0.84, 0, G + 1.52), (0.92, 0, G + 1.9), (0.94, 0, G + 2.12)],
         [0.22, 0.17, 0.15, 0.135, 0.13])                                                             # neck
    lump(mb, (1.07, 0, G + 2.17), (0.22, 0.125, 0.13), tilt=12)                                       # head
    lump(mb, (1.24, 0, G + 2.1), (0.12, 0.1, 0.1))                                                    # muzzle
    for y in (-0.08, 0.08):
        lump(mb, (0.94, y, G + 2.3), (0.04, 0.045, 0.08), tilt=-20)                                   # ears
    limb(mb, [(-0.8, 0, G + 1.3), (-0.86, 0, G + 1.1), (-0.87, 0, G + 0.93)], [0.055, 0.045, 0.05])  # tail

    camel = finish(to_mesh(ob), p, smooth=True)
    blanket(camel, -0.48, 0.14, G + 1.2, 2.0, enamel('Saddle cloth', '#b5212b'), brass())
    # turned a little less than the taxi's -18 degrees: the camel reads by its side view (hump, legs, neck)
    turn_all([o for o in bpy.context.scene.objects if o not in before], -8)
