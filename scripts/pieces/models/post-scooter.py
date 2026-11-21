# The post scooter: a postman riding a step-through scooter, with the yellow mail box behind him.
# The scooter itself is scooter() in models/_scooter.py, shared with the courier scooter.
exec(compile(open(os.path.join(HERE, 'models', '_scooter.py'), encoding='utf-8').read(), '_scooter.py', 'exec'), globals())

LOOK_Z, WIDTH = 1.0, 3.6


def rider():
    """a simple figure leaning to the handlebar, feet on the footboard, in a round helmet"""
    p = pewter()
    visor = mat('Visor', '#10161f', 0.08, coat=1.0)
    out = []
    hip = Vector((-0.36, 0, G + 1.02))
    out.append(ball(0.19, tuple(hip), p, scale=(1.05, 1.15, 0.75)))
    lean, length = math.radians(26), 0.6
    top = hip + Vector((math.sin(lean), 0, math.cos(lean))) * length
    torso = taper_top(box((0.34, 0.42, length), tuple((hip + top) / 2), p, bevel=0.1), 0.95, 1.12)
    torso.rotation_euler = (0, lean, 0)
    out.append(torso)
    head = top + Vector((0.1, 0, 0.21))
    out.append(cyl(0.07, 0.14, tuple(top + Vector((0.05, 0, 0.08))), p))                        # neck
    out.append(ball(0.2, tuple(head), p))                                                       # helmet
    out.append(ball(0.185, tuple(head + Vector((0.035, 0, -0.03))), visor, scale=(1, 0.93, 0.6)))  # visor
    gx, gy, gz = GRIP
    for sy in (-1, 1):
        sh = top + Vector((-0.02, sy * 0.2, -0.06))
        out.append(tube([tuple(sh), tuple(sh + Vector((0.18, sy * 0.07, -0.16))), (gx + 0.01, sy * (gy - 0.02), gz)], p,
                        radius=0.08, radii=[0.09, 0.08, 0.07]))                              # arm
        out.append(ball(0.075, (gx + 0.01, sy * (gy - 0.02), gz + 0.01), p))                   # hand
        knee = (0.1, sy * 0.18, G + 1.06)
        out.append(tube([(-0.3, sy * 0.13, G + 1.03), knee], p, radius=0.085))                 # thigh
        out.append(ball(0.085, knee, p))
        out.append(tube([knee, (0.17, sy * 0.16, G + 0.48)], p, radius=0.07))                 # shin
        out.append(box((0.22, 0.11, 0.09), (0.22, sy * 0.16, G + 0.44), p, bevel=0.03))        # foot
    return out


def make():
    yellow = enamel('Post', '#f2c400')
    parts = scooter(seat_len=0.5, seat_x=-0.42, rack_x=-0.84, rack_len=0.46)
    parts += rider()
    parts.append(box((0.46, 0.46, 0.42), (-0.84, 0, RACK_Z + 0.205), yellow, bevel=0.04))     # the mail box
    parts.append(box((0.49, 0.49, 0.07), (-0.84, 0, RACK_Z + 0.41), yellow, bevel=0.025))     # its lid
    turn_all(parts, -18)
