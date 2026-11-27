# A berrad: the Moroccan teapot, with its pointed lid, long spout and looped handle.
LOOK_Z, WIDTH = 1.25, 4.5


def make():
    p = pewter()
    cyl(0.5, 0.1, (0, 0, G + 0.05), p, bevel=0.03, radius2=0.4)                  # foot
    ball(0.72, (0, 0, G + 0.72), p, scale=(1, 1, 0.86))                          # belly
    for z, r in ((0.5, 0.675), (0.72, 0.725), (0.94, 0.675)):                    # engraved bands
        torus(r, 0.022, (0, 0, G + z), p)
    cyl(0.42, 0.16, (0, 0, G + 1.34), p, radius2=0.36)                           # neck
    cyl(0.44, 0.06, (0, 0, G + 1.44), p, bevel=0.02)                             # rim
    cyl(0.4, 0.5, (0, 0, G + 1.72), p, radius2=0.05)                             # pointed lid
    ball(0.09, (0, 0, G + 2.02), brass())                                        # knob
    cyl(0.03, 0.08, (0, 0, G + 1.95), brass())
    tube([(0.5, 0, G + 0.62), (0.98, 0, G + 0.72), (1.06, 0, G + 1.2), (1.36, 0, G + 1.58)], p, radius=0.15,
         radii=[0.17, 0.13, 0.085, 0.06])                                        # spout
    tube([(-0.5, 0, G + 1.18), (-1.0, 0, G + 1.42), (-1.3, 0, G + 0.95), (-1.0, 0, G + 0.5), (-0.6, 0, G + 0.42)], p,
         radius=0.055)                                                           # handle
    ball(0.07, (-1.2, 0, G + 1.22), p)                                           # thumb rest
