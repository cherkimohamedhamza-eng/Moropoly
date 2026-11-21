# Models the eleven player pieces in Blender and renders each one twice, as see-through pictures:
#   tok-N    a close portrait, for the round token coins in the menus
#   piece-N  the piece standing on its base in a fixed frame, for the pawns on the board
# Blender renders large masters into scripts/.renders/; scripts/finish-renders.mjs then shrinks and sharpens them
# into the sizes screens need, in public/assets/ (npm run pieces does both).
#
#   blender -b -P scripts/pieces/make-pieces.py                      all of them            (npm run pieces)
#   blender -b -P scripts/pieces/make-pieces.py -- camel teapot      only these
#   blender -b -P scripts/pieces/make-pieces.py -- --glb             the same pieces as 3D models, public/assets/models/piece-N.glb,
#                                 for the live table view (src/ui/table3d.js)
#   blender -b -P scripts/pieces/make-pieces.py -- --preview <folder> camel
#                                 PNG pictures named <folder>/camel.png and camel-piece.png, to look at while modelling
#
# Each piece is one file in scripts/pieces/models/: it defines make(), which builds the figure on the base, and
# optionally LOOK_Z and WIDTH to frame its portrait, and SIZE to make the whole figure smaller or larger. The helpers below (box, cyl, ball, tube, ...) are available
# to those files as plain names. Every piece gets the same base, camera and light, so the set matches.
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
RENDERS = os.path.normpath(os.path.join(HERE, '..', '.renders'))
MODELS = os.path.normpath(os.path.join(HERE, '..', '..', 'public', 'assets', 'models'))
LIVE = False                      # True while making .glb models for the live table view: lighter meshes, plain materials
SUPER = 3                         # masters are this many times the biggest size shown, so shrinking them gives clean, sharp edges
# the order of TOKENS in src/engine/data.ts: tok-0 is the red taxi, tok-10 the Hassan Tower
ORDER = ['taxi-red', 'taxi-blue', 'train', 'camel', 'koutoubia', 'teapot', 'ferry', 'post-scooter', 'courier-scooter', 'fishing-boat',
         'hassan-tower']

ELEVATION, TURN = 34, 32          # where the camera stands: degrees above the horizon, and round to the right of the front
PORTRAIT = 384                    # tok-N: PORTRAIT x PORTRAIT
BOARD_W, BOARD_H = 384, 512       # piece-N: this frame always shows BOARD_UNITS across,
BOARD_UNITS = 4.0                 # with the point the figure stands on 50% across and BASE_AT of the way down
BASE_AT = 0.8                     # (src/styles.css .pawn relies on these numbers)
G = 0.205                         # the height a figure stands at (once the top of a pedestal; the models are built up from here)


def srgb(hex_colour):
    c = [int(hex_colour[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


MATS = {}


def mat(name, colour='#c9ccd2', roughness=0.32, metallic=0.0, coat=0.0):
    """a material; asking again for the same name gives the same one"""
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*srgb(colour), 1)
    b.inputs['Roughness'].default_value = roughness
    b.inputs['Metallic'].default_value = metallic
    if coat and 'Coat Weight' in b.inputs:
        b.inputs['Coat Weight'].default_value = coat
        b.inputs['Coat Roughness'].default_value = 0.06
    MATS[name] = m
    return m


def cast(name, light, dark):
    """a cast metal: `light` where the surface is open, `dark` and duller in the crevices, like a figure that has
    been handled. The dark crevices are what keep small details readable."""
    if name in MATS:
        return MATS[name]
    m = mat(name, light, 0.3, metallic=1.0)
    if LIVE:                                                    # the browser cannot run these nodes; export_glb bakes the crevices instead
        return m
    nodes, links = m.node_tree.nodes, m.node_tree.links
    bsdf = nodes.get('Principled BSDF')
    ao = nodes.new('ShaderNodeAmbientOcclusion')
    ao.inputs['Distance'].default_value = 0.3
    ao.samples = 12
    tone = nodes.new('ShaderNodeValToRGB')                      # how open a spot is -> its colour
    tone.color_ramp.elements[0].position = 0.35
    tone.color_ramp.elements[0].color = (*srgb(dark), 1)
    tone.color_ramp.elements[1].position = 0.92
    tone.color_ramp.elements[1].color = (*srgb(light), 1)
    dull = nodes.new('ShaderNodeMapRange')                      # ... and its roughness
    dull.inputs['From Min'].default_value, dull.inputs['From Max'].default_value = 0.35, 0.92
    dull.inputs['To Min'].default_value, dull.inputs['To Max'].default_value = 0.6, 0.27
    links.new(ao.outputs['AO'], tone.inputs['Fac'])
    links.new(ao.outputs['AO'], dull.inputs['Value'])
    links.new(tone.outputs['Color'], bsdf.inputs['Base Color'])
    links.new(dull.outputs['Result'], bsdf.inputs['Roughness'])
    grain = nodes.new('ShaderNodeTexNoise')                     # the faint grain of cast metal, so it is not mirror-perfect
    grain.inputs['Scale'].default_value = 55
    grain.inputs['Detail'].default_value = 4
    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.06
    bump.inputs['Distance'].default_value = 0.02
    links.new(grain.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return m


def pewter():
    """the silver metal every piece is cast in"""
    return cast('Pewter', '#c3c7d0', '#4a4e57')


def brass():
    return mat('Brass', '#e0b24a', 0.28, metallic=1.0)


def enamel(name, colour):
    """glossy paint, for the few coloured parts"""
    return mat(name, colour, 0.22, coat=1.0)


def finish(o, m, bevel=0.0, smooth=False):
    """gives a part its material and its shading. Curved surfaces are shaded smooth and real corners stay crisp;
    a bevel rounds a block's corners a little so they catch the light, and its flat faces stay flat."""
    me = o.data
    for p in me.polygons:
        p.use_smooth = True
    if bevel:
        b = o.modifiers.new('Bevel', 'BEVEL')
        b.width = bevel
        b.segments = 2 if LIVE else 4
        b.limit_method = 'ANGLE'
    else:
        bm = bmesh.new()
        bm.from_mesh(me)
        for e in bm.edges:
            e.smooth = len(e.link_faces) == 2 and e.calc_face_angle(0) < math.radians(40)
        bm.to_mesh(me)
        bm.free()
    flat = o.modifiers.new('Normals', 'WEIGHTED_NORMAL')      # big faces decide the shading, so they do not look bent
    flat.keep_sharp = True
    me.materials.append(m)
    return o


def box(size, at, m, bevel=0.02, turn=0.0):
    """a block `size` (x, y, z) centred `at`, turned `turn` degrees round the upright axis"""
    bpy.ops.mesh.primitive_cube_add(size=1, location=at, rotation=(0, 0, math.radians(turn)))
    o = bpy.context.active_object
    o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)   # keeps its own centre, so it can be turned in place
    return finish(o, m, bevel)


def cyl(radius, depth, at, m, bevel=0.0, rot=(0, 0, 0), verts=40, radius2=None):
    """an upright cylinder (or a cone ending in radius2) centred `at`; `rot` turns it, in degrees"""
    if radius2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=at,
                                            rotation=tuple(math.radians(a) for a in rot))
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=radius, radius2=radius2, depth=depth, location=at,
                                        rotation=tuple(math.radians(a) for a in rot))
    return finish(bpy.context.active_object, m, bevel, smooth=True)


def ball(radius, at, m, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, segments=20 if LIVE else 40, ring_count=10 if LIVE else 20, location=at)
    o = bpy.context.active_object
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(o, m, smooth=True)


def torus(major, minor, at, m, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, location=at, major_segments=64, minor_segments=12,
                                     rotation=tuple(math.radians(a) for a in rot))
    return finish(bpy.context.active_object, m, smooth=True)


def tube(points, m, radius=0.06, radii=None):
    """a bent rod through `points`, optionally changing thickness along its length (`radii`, one per point)"""
    cu = bpy.data.curves.new('Tube', 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = radius
    cu.bevel_resolution = 6
    cu.use_fill_caps = True
    sp = cu.splines.new('NURBS')
    sp.points.add(len(points) - 1)
    for i, p in enumerate(points):
        sp.points[i].co = (*p, 1)
        sp.points[i].radius = (radii[i] / radius) if radii else 1
    sp.use_endpoint_u = True
    sp.order_u = min(4, len(points))
    sp.resolution_u = 16
    o = bpy.data.objects.new('Tube', cu)
    bpy.context.scene.collection.objects.link(o)
    o.data.materials.append(m)
    return o


def taper_top(o, fx, fy, shift=(0, 0)):
    """pulls in the top of a box (to fx, fy of its size) and slides it by `shift`: a cabin, a hull, a nose"""
    bm = bmesh.new()
    bm.from_mesh(o.data)
    top = max(v.co.z for v in bm.verts)
    for v in bm.verts:
        if abs(v.co.z - top) < 1e-5:
            v.co.x = v.co.x * fx + shift[0]
            v.co.y = v.co.y * fy + shift[1]
    bm.to_mesh(o.data)
    bm.free()
    return o


def turn_all(objects, degrees):
    """turns a group of parts together round the middle of the base, keeping each part's own tilt"""
    a = math.radians(degrees)
    for o in objects:
        x, y = o.location.x, o.location.y
        o.location.x, o.location.y = x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a)
        o.rotation_euler = (o.rotation_euler.x, o.rotation_euler.y, o.rotation_euler.z + a)


def graphics_card(scene):
    """renders on the graphics card when Blender can use one (many times faster), otherwise on the processor"""
    scene.cycles.device = 'CPU'
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        for kind in ('OPTIX', 'CUDA', 'HIP', 'ONEAPI', 'METAL'):
            try:
                prefs.compute_device_type = kind
            except TypeError:
                continue
            prefs.get_devices()
            cards = [d for d in prefs.devices if d.type == kind]
            if cards:
                for d in prefs.devices:
                    d.use = d.type == kind
                scene.cycles.device = 'GPU'
                return
        prefs.compute_device_type = 'NONE'
    except Exception as e:                                       # no cycles add-on preferences: stay on the processor
        print('rendering on the processor:', e)


def stage(preview):
    """an empty scene with the surroundings, the light, a floor that only shows shadows, and the base"""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear()
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    graphics_card(scene)
    scene.cycles.samples = 96 if preview else 640
    scene.cycles.use_denoising = True
    try:                                            # the careful denoiser: it keeps fine detail and edges
        scene.cycles.denoiser = 'OPENIMAGEDENOISE'
        scene.cycles.denoising_input_passes = 'RGB_ALBEDO_NORMAL'
        scene.cycles.denoising_prefilter = 'ACCURATE'
    except (TypeError, AttributeError):
        pass
    scene.cycles.filter_width = 1.0                 # a tighter pixel filter than the default: crisper edges
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.image_settings.compression = 30
    scene.view_settings.view_transform = 'Standard'
    try:
        scene.view_settings.look = 'Medium High Contrast'
    except TypeError:
        pass                                        # this Blender names its looks differently: keep the plain one

    # a studio picture as surroundings, so the metal has something to mirror
    world = bpy.data.worlds.new('Studio')
    world.use_nodes = True
    nodes, links = world.node_tree.nodes, world.node_tree.links
    bg = nodes['Background']
    hdr = os.path.join(bpy.utils.system_resource('DATAFILES'), 'studiolights', 'world', 'interior.exr')
    if os.path.exists(hdr):
        env = nodes.new('ShaderNodeTexEnvironment')
        env.image = bpy.data.images.load(hdr)
        links.new(env.outputs['Color'], bg.inputs['Color'])
        bg.inputs['Strength'].default_value = 0.62
    else:
        bg.inputs['Color'].default_value = (0.8, 0.85, 0.95, 1)
    scene.world = world

    bpy.ops.object.light_add(type='SUN', rotation=(math.radians(36), 0, math.radians(-50)))
    sun = bpy.context.active_object
    sun.data.energy = 2.6
    sun.data.angle = math.radians(4)                # a small sun: crisp highlights and a firm shadow
    bpy.ops.object.light_add(type='AREA', location=(-3.2, 4.2, 4.6))   # from behind, to pick out the far edges
    rim = bpy.context.active_object
    rim.data.energy = 420
    rim.data.size = 3.5
    rim.rotation_euler = (Vector((0, 0, 1.2)) - rim.location).to_track_quat('-Z', 'Y').to_euler()
    # no floor: the pieces cast no shadow (the board draws a coloured ring under each one instead)

    # no pedestal and no floor: a piece is only its figure, standing at height G. On the board a spot in the
    # player's colour is drawn under it (src/styles.css .pawn::after, src/ui/table3d.js).
    return scene


def camera(scene, target, units, width, height):
    e, t = math.radians(ELEVATION), math.radians(TURN)
    away = Vector((math.sin(t) * math.cos(e), -math.cos(t) * math.cos(e), math.sin(e)))
    bpy.ops.object.camera_add(location=Vector(target) + away * 30)
    cam = bpy.context.active_object
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = units * max(1, height / width)      # ortho_scale spans the longer side
    look = (-away).to_track_quat('-Z', 'Y')
    cam.rotation_euler = look.to_euler()
    scene.camera = cam
    scene.render.resolution_x, scene.render.resolution_y = width * scene['super'], height * scene['super']
    return cam, away, look @ Vector((0, 1, 0))       # the camera, the way back to it, and which way is up in the picture


def shoot(scene, path):
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print('saved', path)


def build(model):
    """makes the model's figure; a model that sets SIZE is then shrunk or grown as a whole, about the point it stands on"""
    before = set(bpy.context.scene.objects)
    model['make']()
    size = model.get('SIZE', 1)
    if size != 1:
        foot = Vector((0, 0, G))
        for o in bpy.context.scene.objects:
            if o not in before:
                o.location = foot + (o.location - foot) * size
                o.scale = o.scale * size


def render_piece(name, model, out, preview):
    scene = stage(preview)
    scene['super'] = 1 if preview else SUPER
    build(model)
    ext = '.png'
    k = ORDER.index(name)
    # the portrait, framed for this piece
    camera(scene, (0.25, 0, model.get('LOOK_Z', 1.25)), model.get('WIDTH', 4.6), PORTRAIT, PORTRAIT)
    shoot(scene, os.path.join(out, (name if preview else f'tok-{k}') + ext))
    # the board picture: the same frame for every piece
    cam, away, up = camera(scene, (0, 0, 0), BOARD_UNITS, BOARD_W, BOARD_H)
    frame_h = BOARD_UNITS * BOARD_H / BOARD_W
    cam.location = Vector((0, 0, G)) + up * (BASE_AT - 0.5) * frame_h + away * 30
    shoot(scene, os.path.join(out, (name + '-piece' if preview else f'piece-{k}') + ext))


def outline(profile, half, half_top=None):
    """a solid cut from a side-view outline: `profile` is (x, z) points going round once, `half` is half its width.
    With `half_top` the sides lean in towards the top, like a car's windows."""
    zs = [z for _, z in profile]
    z0, z1 = min(zs), max(zs)

    def wide(z):
        return half if half_top is None else half + (half_top - half) * (z - z0) / (z1 - z0)

    bm = bmesh.new()
    near = [bm.verts.new((x, -wide(z), z)) for x, z in profile]
    far = [bm.verts.new((x, wide(z), z)) for x, z in profile]
    bm.faces.new(near)
    bm.faces.new(far[::-1])
    for i in range(len(profile)):
        j = (i + 1) % len(profile)
        bm.faces.new((near[j], near[i], far[i], far[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new('Outline')
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new('Outline', me)
    bpy.context.scene.collection.objects.link(o)
    return o


def carve(target, cutters):
    """cuts the `cutters` out of `target` (wheel arches out of a car body)"""
    bpy.context.view_layer.objects.active = target
    for c in cutters:
        m = target.modifiers.new('Cut', 'BOOLEAN')
        m.operation = 'DIFFERENCE'
        m.object = c
        m.solver = 'EXACT'
        bpy.ops.object.modifier_apply(modifier=m.name)
        bpy.data.objects.remove(c, do_unlink=True)
    target.data.materials.clear()        # the cut leaves an empty material slot behind, which would win over the paint
    for f in target.data.polygons:
        f.material_index = 0
    return target


def word(text, size, at, m, turn):
    """raised lettering standing upright; `turn` is which way it faces: 0 the near side (-Y), 90 the front (+X), 180 the far side"""
    bpy.ops.object.text_add(location=at, rotation=(math.radians(90), 0, math.radians(turn)))
    o = bpy.context.active_object
    o.data.body = text
    o.data.size = size
    o.data.extrude = 0.006
    o.data.align_x = 'CENTER'
    o.data.align_y = 'CENTER'
    o.data.materials.append(m)
    return o


def taxi(colour):
    """a Moroccan petit taxi: an old five-door hatchback with black bumpers and steel wheels, and on its roof rack
    the long lit TAXI box (models/taxi-red.py for Casablanca's red ones, taxi-blue.py for Rabat's blue ones).
    The nose is at +X. Heights below are above the base."""
    paint = mat('Paint', colour, 0.36, coat=0.5)        # old paint: glossy, but not a mirror
    glass = mat('Glass', '#0d1218', 0.06, coat=1.0)
    black = mat('Black plastic', '#0e0f11', 0.72)
    tyre = mat('Tyre', '#141416', 0.8)
    steel = mat('Steel wheel', '#2c2e33', 0.45, metallic=0.8)
    lamp = mat('Lamp', '#f3efe2', 0.12, coat=1.0)
    amber = mat('Indicator', '#f29a1c', 0.2, coat=1.0)
    tail = mat('Tail lamp', '#8f1418', 0.2, coat=1.0)
    yellow = enamel('Sign', '#f2c400')
    plate = mat('Plate', '#e8e6df', 0.5)
    p = pewter()
    car = []
    z = lambda h: G + h
    FRONT, REAR, HALF = 0.60, -0.64, 0.42        # the two axles, and half the body's width
    WHEEL = 0.158

    # the body up to the windows: a wedge with a low sloping bonnet, and round arches cut for the wheels
    body = outline([(0.95, z(0.13)), (0.96, z(0.33)), (0.9, z(0.365)), (0.43, z(0.445)), (-0.87, z(0.465)), (-0.945, z(0.43)),
                    (-0.95, z(0.15)), (-0.9, z(0.1)), (0.88, z(0.1))], HALF)
    arches = []
    for x in (FRONT, REAR):
        bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=0.195, depth=1.2, location=(x, 0, z(WHEEL - 0.01)), rotation=(math.radians(90), 0, 0))
        arches.append(bpy.context.active_object)
    car.append(finish(carve(body, arches), paint, bevel=0.035))

    # the windows are one dark block; the roof and the pillars are laid over it in the body colour
    car.append(finish(outline([(0.435, z(0.43)), (0.13, z(0.7)), (-0.62, z(0.7)), (-0.905, z(0.45))], HALF - 0.02, HALF - 0.075), glass, bevel=0.012))
    car.append(finish(outline([(0.16, z(0.69)), (0.13, z(0.715)), (-0.61, z(0.715)), (-0.645, z(0.69))], HALF - 0.062), paint, bevel=0.012))
    for sy in (-1, 1):
        low, high = sy * (HALF - 0.012), sy * (HALF - 0.068)
        for (x0, x1, r) in ((0.44, 0.14, 0.024), (-0.07, -0.07, 0.02), (-0.47, -0.47, 0.02), (-0.9, -0.63, 0.03)):   # the four pillars
            car.append(tube([(x0, low, z(0.445)), (x1, high, z(0.7))], paint, radius=r))
        car.append(tube([(0.14, high, z(0.7)), (-0.63, high, z(0.7))], paint, radius=0.02))                           # the roof's edge
        # wheels: black tyres on dark steel rims
        for x in (FRONT, REAR):
            car.append(cyl(WHEEL, 0.12, (x, sy * 0.365, z(WHEEL)), tyre, bevel=0.035, rot=(90, 0, 0)))
            car.append(cyl(0.098, 0.13, (x, sy * 0.365, z(WHEEL)), steel, bevel=0.012, rot=(90, 0, 0)))
            car.append(cyl(0.032, 0.15, (x, sy * 0.365, z(WHEEL)), black, rot=(90, 0, 0)))
        car.append(box((0.92, 0.014, 0.024), (-0.02, sy * (HALF + 0.004), z(0.265)), black, bevel=0.005))               # the rubbing strip
        for x in (0.08, -0.33):
            car.append(box((0.075, 0.014, 0.02), (x, sy * (HALF + 0.004), z(0.385)), black, bevel=0.004))              # door handles
        for x in (-0.07, -0.47):
            car.append(box((0.008, 0.008, 0.3), (x, sy * (HALF + 0.002), z(0.29)), black, bevel=0))                    # door gaps
        car.append(box((0.06, 0.075, 0.05), (0.37, sy * (HALF + 0.045), z(0.47)), black, bevel=0.012))                 # mirror
        car.append(box((0.02, 0.05, 0.02), (0.37, sy * (HALF + 0.005), z(0.455)), black, bevel=0))
        # lamps: square headlamps with an indicator at the corner, tail lamps at the back
        car.append(box((0.03, 0.17, 0.075), (0.948, sy * 0.265, z(0.29)), lamp, bevel=0.008))
        car.append(box((0.04, 0.06, 0.075), (0.94, sy * 0.385, z(0.29)), amber, bevel=0.008))
        car.append(box((0.03, 0.15, 0.085), (-0.94, sy * 0.33, z(0.345)), tail, bevel=0.008))

    # the grille: slats in the body colour over a dark opening
    car.append(box((0.02, 0.34, 0.075), (0.95, 0, z(0.29)), black, bevel=0))
    for k in range(4):
        car.append(box((0.022, 0.34, 0.009), (0.957, 0, z(0.262 + k * 0.019)), paint, bevel=0))
    # black bumpers that wrap the corners, a plate on each
    for x, lift in ((0.93, 0.18), (-0.925, 0.2)):
        car.append(box((0.1, 2 * HALF + 0.05, 0.1), (x, 0, z(lift)), black, bevel=0.03))
        car.append(box((0.012, 0.2, 0.05), (x + (0.056 if x > 0 else -0.056), 0, z(lift)), plate, bevel=0.004))
    car.append(tube([(0.2, -0.2, z(0.71)), (0.05, -0.2, z(0.98))], black, radius=0.007))                                # the aerial

    # the roof rack and the long taxi box on it
    RACK = 0.775
    for x in (0.02, -0.52):
        car.append(box((0.028, 0.74, 0.022), (x, 0, z(RACK)), black, bevel=0.004))
        for sy in (-1, 1):
            car.append(box((0.03, 0.03, 0.06), (x, sy * 0.33, z(RACK - 0.035)), black, bevel=0.004))
    for sy in (-1, 1):
        car.append(box((0.6, 0.02, 0.02), (-0.25, sy * 0.36, z(RACK)), black, bevel=0.004))
    BX, BL, BW, BH = -0.22, 0.56, 0.7, 0.105            # the box: where it sits, how long, wide and tall
    top = RACK + 0.011 + BH / 2
    car.append(box((BL, BW, BH), (BX, 0, z(top)), black, bevel=0.012))
    for end in (1, -1):                                  # a lit yellow face at the front and the back
        car.append(box((0.014, BW - 0.05, BH - 0.03), (BX + end * (BL / 2 + 0.002), 0, z(top)), yellow, bevel=0.004))
    car.append(word('TAXI', 0.082, (BX + BL / 2 + 0.012, 0, z(top)), black, 90))
    for sy, turn in ((-1, 0), (1, 180)):                 # yellow lettering on the black sides
        car.append(word('TAXI', 0.08, (BX, sy * (BW / 2 + 0.004), z(top)), yellow, turn))
    turn_all(car, -18)


def export_glb(path):
    """saves everything standing in the scene as one .glb model for the live table view (src/ui/table3d.js):
    the parts are joined into one mesh, and soft shading (how hidden each corner is) is baked into its colours,
    so the model has dark crevices in the browser without any extra work there"""
    import numpy as np
    scene = bpy.context.scene
    parts = [o for o in scene.objects if o.type in ('MESH', 'CURVE', 'FONT', 'META')]
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.convert(target='MESH')          # curves and lettering become meshes; bevels and the like are applied
    bpy.ops.object.join()
    o = bpy.context.active_object
    me = o.data
    if len(me.polygons) > 9000:                     # a very fine mesh (a smooth animal, a hull): thin it for the browser
        thin = o.modifiers.new('Thin', 'DECIMATE')
        thin.ratio = 9000 / len(me.polygons)
        bpy.ops.object.modifier_apply(modifier=thin.name)
        for p in me.polygons:
            p.use_smooth = True
    shade = me.color_attributes.new('Shade', 'BYTE_COLOR', 'POINT')      # one colour per point, so the file stays small
    me.color_attributes.active_color = shade
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 48
    bpy.ops.object.bake(type='AO', target='VERTEX_COLORS')
    shade = me.color_attributes['Shade']
    buf = np.empty(len(shade.data) * 4, dtype=np.float32)
    shade.data.foreach_get('color', buf)
    buf = buf.reshape(-1, 4)
    buf[:, :3] = 0.5 + 0.5 * np.power(np.clip(buf[:, :3], 0, 1), 0.7)       # keep the crevices shaded, not black
    buf[:, 3] = 1
    shade.data.foreach_set('color', buf.ravel())
    os.makedirs(os.path.dirname(path), exist_ok=True)
    common = dict(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
                  export_texcoords=False, export_animations=False)
    try:                                            # plain, uncompressed: the site's security policy allows no decoder to unpack anything else
        bpy.ops.export_scene.gltf(**common, export_vertex_color='ACTIVE', export_all_vertex_colors=False)
    except TypeError:                               # an exporter that names these options differently
        bpy.ops.export_scene.gltf(**common)
    print('saved', path, f'({os.path.getsize(path) / 1024:.0f} KB, {len(me.polygons)} faces)')


def load(name):
    """runs models/<name>.py with the helpers above as its globals, and returns what it defined"""
    path = os.path.join(HERE, 'models', name + '.py')
    space = dict(globals())
    with open(path, encoding='utf-8') as f:
        exec(compile(f.read(), path, 'exec'), space)
    return space


if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    preview = '--preview' in args
    out = os.path.abspath(args[args.index('--preview') + 1]) if preview else RENDERS
    names = [a for a in args if a in ORDER] or ORDER
    os.makedirs(out, exist_ok=True)
    for name in names:
        if '--glb' in args:
            LIVE = True
            stage(True)
            build(load(name))
            export_glb(os.path.join(MODELS, f'piece-{ORDER.index(name)}.glb'))
        else:
            render_piece(name, load(name), out, preview)
