# The motor scooter shared by post-scooter.py and courier-scooter.py (not a piece itself: its name starts with _).
# It is built along X with the front wheel at +X; the piece files add their load and then turn everything with turn_all.
from mathutils import Matrix

WHEEL_R, WHEEL_Z = 0.26, G + 0.25            # the tyres sink 0.01 into the base, so they stand on it
FRONT_X, REAR_X = 0.8, -0.68
RACK_Z = G + 0.86                            # the top of the luggage rack over the rear wheel
GRIP = (0.355, 0.38, G + 1.29)               # where the handlebar grips are (x, ±y, z)


def steer(objects, degrees):
    """turns the front end (wheel, fork, handlebar) round the steering axis"""
    pivot = Vector((FRONT_X, 0, WHEEL_Z))
    axis = Vector((-0.17, 0, 0.5)).normalized()
    turn = Matrix.Translation(pivot) @ Matrix.Rotation(math.radians(degrees), 4, axis) @ Matrix.Translation(-pivot)
    for o in objects:
        loc, rot, scale = (turn @ Matrix.LocRotScale(o.location, o.rotation_euler, o.scale)).decompose()
        o.location, o.rotation_euler, o.scale = loc, rot.to_euler('XYZ'), scale


def scooter(seat_len=0.62, seat_x=-0.5, rack_x=-0.8, rack_len=0.48, stand=False, steering=0):
    """the scooter on its two wheels; returns its parts"""
    p = pewter()
    tyre = mat('Tyre', '#1b1c1f', 0.7)
    lamp = mat('Lamp', '#fff4c2', 0.1)
    body, front = [], []

    def wheel(x, into):
        into.append(cyl(WHEEL_R, 0.18, (x, 0, WHEEL_Z), tyre, bevel=0.055, rot=(90, 0, 0)))
        into.append(cyl(0.14, 0.2, (x, 0, WHEEL_Z), p, bevel=0.02, rot=(90, 0, 0)))
        into.append(cyl(0.065, 0.22, (x, 0, WHEEL_Z), p, bevel=0.015, rot=(90, 0, 0)))

    wheel(FRONT_X, front)
    wheel(REAR_X, body)

    # the front end, which steers: mudguard, fork, steering column, headlamp and handlebar
    arc = [(FRONT_X + 0.37 * math.cos(math.radians(a)), 0, WHEEL_Z + 0.37 * math.sin(math.radians(a)))
           for a in (12, 50, 90, 130, 166)]
    guard = tube(arc, p, radius=0.08)
    guard.scale = (1, 1.55, 1)
    front.append(guard)
    for sy in (-1, 1):
        front.append(tube([(FRONT_X, sy * 0.135, WHEEL_Z), (FRONT_X - 0.18, sy * 0.125, WHEEL_Z + 0.52)], p, radius=0.06))
    front.append(tube([(0.53, 0, G + 0.95), (0.46, 0, G + 1.2)], p, radius=0.075))           # steering column
    front.append(taper_top(box((0.3, 0.36, 0.17), (0.45, 0, G + 1.22), p, bevel=0.06), 0.8, 0.9))   # handlebar cover
    front.append(cyl(0.085, 0.06, (0.59, 0, G + 1.21), lamp, rot=(0, 90, 0)))                 # headlamp
    front.append(torus(0.085, 0.022, (0.605, 0, G + 1.21), brass(), rot=(0, 90, 0)))        # its brass rim
    gx, gy, gz = GRIP
    front.append(tube([(gx, -gy + 0.01, gz), (0.45, -0.2, gz - 0.03), (0.45, 0.2, gz - 0.03), (gx, gy - 0.01, gz)], p,
                      radius=0.055))                                                         # handlebar
    for sy in (-1, 1):
        front.append(cyl(0.062, 0.13, (gx, sy * gy, gz), tyre, bevel=0.02, rot=(90, 0, 0)))   # grips

    # the body: the curved leg shield (a flattened tube), footboard, the rounded cover over the engine and
    # rear wheel, seat, rack, exhaust
    shield = tube([(0.3, 0, G + 0.36), (0.44, 0, G + 0.6), (0.5, 0, G + 0.9), (0.47, 0, G + 1.1)], p, radius=0.11,
                  radii=[0.1, 0.13, 0.12, 0.075])
    shield.scale = (1, 2.4, 1)
    body.append(shield)
    body.append(box((0.76, 0.44, 0.09), (0.06, 0, G + 0.355), p, bevel=0.03))               # footboard
    body.append(taper_top(box((0.84, 0.56, 0.46), (-0.62, 0, G + 0.61), p, bevel=0.15), 0.86, 0.84, shift=(0.03, 0)))
    body.append(box((seat_len, 0.36, 0.1), (seat_x, 0, G + 0.87), p, bevel=0.045))           # seat
    body.append(box((rack_len, 0.42, 0.04), (rack_x, 0, RACK_Z - 0.02), p, bevel=0.012))     # rack
    body.append(tube([(-0.25, 0.12, G + 0.24), (-0.5, 0.29, G + 0.24), (-1.0, 0.29, G + 0.32)], p, radius=0.07,
                     radii=[0.04, 0.07, 0.07]))                                             # exhaust, on the far side
    if stand:                                                                               # the centre stand, down
        for sy in (-1, 1):
            leg = box((0.07, 0.06, 0.4), (-0.25, sy * 0.19, G + 0.19), p, bevel=0.015)
            leg.rotation_euler = (0, math.radians(15), 0)
            body.append(leg)
        body.append(box((0.09, 0.46, 0.04), (-0.3, 0, G + 0.015), p, bevel=0.012))

    if steering:
        steer(front, steering)
    return body + front
