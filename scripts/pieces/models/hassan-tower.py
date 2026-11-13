# The Hassan Tower in Rabat: the unfinished minaret of red sandstone, flat-topped, with its lattice-work panels and
# lobed arches, the stair stub at one corner, and the stumps of the old mosque's columns standing round it.
LOOK_Z, WIDTH = 1.3, 4.0
SIZE = 0.76          # a tower is tall and broad: brought down so it does not dwarf the other pieces

W, H = 1.12, 2.8             # how wide the tower is, and how tall
TIERS = (0.95, 1.86)         # the two ledges that divide it into three storeys


def make():
    stone = cast('Red sandstone', '#c98f5d', '#5b3a23')      # cast in a warm metal the colour of the tower's stone
    dark = mat('Opening', '#170f0a', 0.9)
    grey = pewter()
    half = W / 2

    box((W, W, H), (0, 0, G + H / 2), stone, bevel=0.02)
    box((W + 0.08, W + 0.08, 0.1), (0, 0, G + 0.05), stone, bevel=0.015)                 # the footing
    for z in TIERS:
        box((W + 0.05, W + 0.05, 0.035), (0, 0, G + z), stone, bevel=0.008)              # the ledges
    box((W + 0.03, W + 0.03, 0.05), (0, 0, G + H - 0.025), stone, bevel=0.01)            # the plain top edge

    for face in range(4):
        a = math.radians(90 * face)
        n = Vector((math.sin(a), -math.cos(a), 0))       # out of this face
        side = Vector((math.cos(a), math.sin(a), 0))      # along it
        wall = n * half

        def bar(length, x, z, lean=0, thick=0.03, proud=0.012, m=stone):
            """a strip on this wall: centred x along it and z up it, `lean` degrees from level"""
            o = box((length, 0.03, thick), tuple(wall + n * proud + side * x + Vector((0, 0, G + z))), m, bevel=0)
            o.rotation_euler = (0, math.radians(-lean), a)
            return o

        def disc(radius, x, z, proud=0.014, m=stone):
            return cyl(radius, 0.03, tuple(wall + n * proud + side * x + Vector((0, 0, G + z))), m, rot=(90, 0, 90 * face), verts=20)

        def frame(x0, z0, x1, z1):
            for x in (x0, x1):
                bar(z1 - z0 + 0.03, x, (z0 + z1) / 2, lean=90)
            for z in (z0, z1):
                bar(x1 - x0 + 0.03, (x0 + x1) / 2, z)

        def lobed_arch(x, z, r, lobes=7, lobe=0.036):
            """an arch whose edge is a row of small scallops, with its two jambs"""
            for k in range(lobes):
                t = math.pi * k / (lobes - 1)
                disc(lobe, x + r * math.cos(t), z + r * math.sin(t))
            for sx in (-1, 1):
                bar(0.16, x + sx * r, z - 0.08, lean=90, thick=0.05)

        def window(x, z, w, h):
            """a dark slit with a round head"""
            bar(w, x, z, thick=h, proud=0.009, m=dark)
            disc(w / 2, x, z + h / 2, proud=0.009, m=dark)

        # top storey: the lattice (sebka) over a row of three small arches
        x0, x1, z0, z1 = -0.4, 0.4, 2.2, 2.7
        frame(x0, z0, x1, z1)
        step = 0.16
        for sign in (1, -1):                              # two families of diagonals make the diamonds
            c = -1.2
            while c < 1.2:
                # the part of the line  x - sign*(z - z0) = c  that lies inside the panel
                ts = [max(0.0, (x0 - c) * sign), min(z1 - z0, (x1 - c) * sign)] if sign == 1 else [max(0.0, c - x1), min(z1 - z0, c - x0)]
                if ts[1] - ts[0] > 0.05:
                    tm = (ts[0] + ts[1]) / 2
                    bar((ts[1] - ts[0]) * math.sqrt(2), c + sign * tm, z0 + tm, lean=45 * sign, thick=0.022)
                c += step
        for x in (-0.27, 0, 0.27):
            lobed_arch(x, 2.0, 0.09, lobes=5, lobe=0.028)
        window(0, 1.97, 0.05, 0.1)

        # middle storey: one big lobed arch in a square frame, a window inside it
        frame(-0.36, 1.08, 0.36, 1.76)
        lobed_arch(0, 1.38, 0.25, lobes=9)
        lobed_arch(0, 1.32, 0.13, lobes=5, lobe=0.026)
        window(0, 1.24, 0.07, 0.16)

        # bottom storey: plain wall with the doorway
        frame(-0.2, 0.12, 0.2, 0.62)
        window(0, 0.25, 0.14, 0.26)

    # the stair stub against the front, at the left corner
    for k, h in enumerate((0.42, 0.28, 0.14)):
        box((0.16, 0.22, h), (-half + 0.08 + k * 0.16, -half - 0.11, G + h / 2), stone, bevel=0.008)

    # the column stumps of the unfinished mosque, in grey stone
    for k in range(8):
        t = math.radians(22.5 + 45 * k)
        h = (0.3, 0.2, 0.34, 0.24)[k % 4]
        x, y = 0.93 * math.cos(t), 0.93 * math.sin(t)
        cyl(0.075, h, (x, y, G + h / 2), grey, verts=24)
        cyl(0.088, 0.035, (x, y, G + h - 0.0175), grey, verts=24)
