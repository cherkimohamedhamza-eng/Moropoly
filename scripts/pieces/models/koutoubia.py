# The minaret of the Koutoubia mosque: a square tower with arched panels, battlements, a lantern and three brass balls.
LOOK_Z, WIDTH = 1.55, 4.0
SIZE = 0.74          # a tower is tall: brought down so it does not dwarf the other pieces


def make():
    p = pewter()
    box((0.98, 0.98, 2.05), (0, 0, G + 1.025), p, bevel=0.03)
    box((1.1, 1.1, 0.1), (0, 0, G + 0.05), p, bevel=0.02)                 # plinth
    for face in range(4):                                                  # arched panels and windows on each side
        a = math.radians(90 * face)
        n = Vector((math.sin(a), -math.cos(a), 0))
        side = Vector((math.cos(a), math.sin(a), 0))
        for z, w, h in ((0.55, 0.42, 0.62), (1.4, 0.5, 0.5)):
            c = n * 0.5 + Vector((0, 0, G + z))
            box((w, 0.05, h), tuple(c), p, bevel=0.012, turn=90 * face)
            # the round top sits a hair proud of the panel: two faces in exactly the same plane render black
            cyl(w / 2, 0.05, tuple(c + n * 0.012 + Vector((0, 0, h / 2))), p, rot=(90, 0, 90 * face))
            if z > 1:                                                      # a slit on each side of the upper panel
                for k in (-1, 1):
                    box((0.07, 0.05, 0.3), tuple(c + side * k * 0.36), p, bevel=0.01, turn=90 * face)
    box((1.06, 1.06, 0.16), (0, 0, G + 1.92), p, bevel=0.02)              # the tiled frieze
    for i in range(4):                                                     # battlements
        for j in range(4):
            if i in (0, 3) or j in (0, 3):
                box((0.17, 0.17, 0.2), (-0.42 + i * 0.28, -0.42 + j * 0.28, G + 2.15), p, bevel=0.015)
                box((0.09, 0.09, 0.1), (-0.42 + i * 0.28, -0.42 + j * 0.28, G + 2.29), p, bevel=0.01)
    box((0.5, 0.5, 0.62), (0, 0, G + 2.36), p, bevel=0.02)                # the lantern
    for face in range(4):
        a = math.radians(90 * face)
        n = Vector((math.sin(a), -math.cos(a), 0))
        c = n * 0.26 + Vector((0, 0, G + 2.3))
        box((0.2, 0.04, 0.26), tuple(c), p, bevel=0.01, turn=90 * face)
        cyl(0.1, 0.04, tuple(c + n * 0.012 + Vector((0, 0, 0.13))), p, rot=(90, 0, 90 * face))
    box((0.58, 0.58, 0.07), (0, 0, G + 2.7), p, bevel=0.015)
    ball(0.2, (0, 0, G + 2.78), p, scale=(1, 1, 0.8))                     # the little dome
    for k, r in enumerate((0.11, 0.085, 0.06)):                            # the three balls
        ball(r, (0, 0, G + 2.98 + k * 0.16), brass())
    cyl(0.012, 0.2, (0, 0, G + 3.42), brass())
