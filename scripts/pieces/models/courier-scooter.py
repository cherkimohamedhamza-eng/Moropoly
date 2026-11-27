# The courier scooter: a step-through scooter parked on its stand, with a big orange delivery box on the back.
# The scooter itself is scooter() in models/_scooter.py, shared with the post scooter.
exec(compile(open(os.path.join(HERE, 'models', '_scooter.py'), encoding='utf-8').read(), '_scooter.py', 'exec'), globals())

LOOK_Z, WIDTH = 0.8, 3.6


def make():
    orange = enamel('Courier', '#f28c1b')
    parts = scooter(stand=True, steering=-14)
    parts.append(box((0.64, 0.62, 0.6), (-0.72, 0, RACK_Z + 0.295), orange, bevel=0.045))    # the delivery box
    parts.append(box((0.67, 0.65, 0.1), (-0.72, 0, RACK_Z + 0.57), orange, bevel=0.03))      # its lid
    turn_all(parts, -18)
