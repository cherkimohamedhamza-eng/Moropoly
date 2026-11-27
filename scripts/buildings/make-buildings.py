# Models the dar (house) and the riad (hotel) in Blender and renders each to a see-through picture, shown on the
# board's property tiles. Blender renders large masters into scripts/.renders/ (dar.png, riad.png);
# scripts/finish-renders.mjs then shrinks and sharpens them into public/assets/ (npm run buildings does both).
#
#   blender -b -P scripts/buildings/make-buildings.py
#
# Buildings never turn on the board, so they are rendered once here (Cycles, soft shadow included) instead
# of being drawn live like the dice. Both are seen from the same side and lit from the upper left, like the dice.
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', '.renders'))
MODELS = os.path.normpath(os.path.join(HERE, '..', '..', 'public', 'assets', 'models'))
LIVE = '--glb' in sys.argv     # blender ... -- --glb saves dar.glb and riad.glb, 3D models for the live table view, instead of pictures
SIZE = 576            # the masters are SIZE x SIZE; the board shows the buildings at 15 to 90 px
ELEVATION = 46        # how far above the horizon the camera looks from, in degrees
TURN = 28             # how far round to the right of the front it stands


def srgb(hex_colour):
    c = [int(hex_colour[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def material(name, colour, roughness=0.6):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*srgb(colour), 1)
    b.inputs['Roughness'].default_value = roughness
    return m


def box(name, size, at, mat, bevel=0.03):
    bpy.ops.mesh.primitive_cube_add(size=1, location=at)
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)   # keep its own centre, so it can be turned in place
    if bevel:
        m = o.modifiers.new('Bevel', 'BEVEL')
        m.width = bevel
        m.segments = 2
    o.data.materials.append(mat)
    return o


def pyramid(name, side, height, at, mat):
    """a four-sided tiled roof"""
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=side / math.sqrt(2), depth=height,
                                    location=(at[0], at[1], at[2] + height / 2), rotation=(0, 0, math.radians(45)))
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(mat)
    return o


def door(name, width, height, at, mat):
    """an arched doorway on a wall facing the front (-Y): a slab with a round top"""
    x, y, z = at
    box(name, (width, 0.06, height - width / 2), (x, y, z + (height - width / 2) / 2), mat, bevel=0)
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=width / 2, depth=0.06,
                                        location=(x, y - 0.015, z + height - width / 2), rotation=(math.radians(90), 0, 0))
    bpy.context.active_object.data.materials.append(mat)


def finial(at, mat):
    """the brass balls on the tip of a Moroccan roof"""
    for k, r in enumerate((0.13, 0.09)):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=16, ring_count=8, location=(at[0], at[1], at[2] + k * 0.19))
        o = bpy.context.active_object
        bpy.ops.object.shade_smooth()
        o.data.materials.append(mat)


def cut(target, cutter):
    m = target.modifiers.new('Cut', 'BOOLEAN')
    m.operation = 'DIFFERENCE'
    m.object = cutter
    m.solver = 'EXACT'
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.data.objects.remove(cutter, do_unlink=True)


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
            if any(d.type == kind for d in prefs.devices):
                for d in prefs.devices:
                    d.use = d.type == kind
                scene.cycles.device = 'GPU'
                return
        prefs.compute_device_type = 'NONE'
    except Exception as e:
        print('rendering on the processor:', e)


def stage():
    """an empty scene with the light and the sky"""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    graphics_card(scene)
    scene.cycles.samples = 512
    scene.cycles.use_denoising = True
    scene.cycles.filter_width = 1.0       # a tighter pixel filter than the default: crisper edges
    scene.render.film_transparent = True
    scene.render.resolution_x = scene.render.resolution_y = SIZE
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.view_settings.view_transform = 'Standard'

    world = bpy.data.worlds.new('Sky')
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (0.75, 0.82, 0.95, 1)
    bg.inputs['Strength'].default_value = 0.6
    scene.world = world

    bpy.ops.object.light_add(type='SUN', rotation=(math.radians(34), 0, math.radians(-50)))
    sun = bpy.context.active_object
    sun.data.energy = 2.7
    sun.data.angle = math.radians(9)      # a slightly soft shadow

    return scene                # no floor: the buildings cast no shadow on the tile


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


def shoot(scene, name, look_at, width):
    if LIVE:
        export_glb(os.path.join(MODELS, name + '.glb'))
        return
    """renders what stands in the scene, `width` units across, to OUT/name.webp"""
    e, t = math.radians(ELEVATION), math.radians(TURN)
    away = Vector((math.sin(t) * math.cos(e), -math.cos(t) * math.cos(e), math.sin(e)))
    bpy.ops.object.camera_add(location=Vector(look_at) + away * 30)
    cam = bpy.context.active_object
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = width
    cam.rotation_euler = (-away).to_track_quat('-Z', 'Y').to_euler()
    scene.camera = cam
    scene.render.filepath = os.path.join(OUT, name + '.png')
    bpy.ops.render.render(write_still=True)
    print('saved', scene.render.filepath, f'({os.path.getsize(scene.render.filepath) / 1024:.0f} KB)')


def dar():
    """a whitewashed house under a green tiled roof"""
    scene = stage()
    wall = material('Lime wash', '#f4ecdc', 0.75)
    tiles = material('Green tiles', '#086a38', 0.3)
    wood = material('Cedar door', '#4a2a17', 0.6)
    box('Walls', (1.7, 1.7, 1.15), (0, 0, 0.575), wall)
    box('Eaves', (2.02, 2.02, 0.1), (0, 0, 1.2), tiles, bevel=0.02)
    pyramid('Roof', 2.02, 0.8, (0, 0, 1.25), tiles)
    finial((0, 0, 2.08), material('Brass', '#e3b34a', 0.3))
    door('Door', 0.46, 0.64, (-0.05, -0.86, 0), wood)
    box('Window', (0.06, 0.3, 0.34), (0.86, 0.1, 0.68), wood, bevel=0)
    shoot(scene, 'dar', (0.42, 0, 0.92), 4.0)


def slab(name, size, at, mat, tilt=(0, 0, 0)):
    """a thin sloping board, for tiled eaves"""
    o = box(name, size, at, mat, bevel=0)
    o.rotation_euler = tuple(math.radians(a) for a in tilt)
    return o


def ball(radius, at, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, segments=16, ring_count=8, location=at)
    bpy.ops.object.shade_smooth()
    bpy.context.active_object.data.materials.append(mat)


def horseshoe(name, width, height, at, mat, frame, facing='front'):
    """a horseshoe-arched opening in a white plaster frame, on the front wall (-Y) or the right wall (+X)"""
    turn = 0 if facing == 'front' else math.radians(90)
    out = Vector((0, -1, 0)) if facing == 'front' else Vector((1, 0, 0))
    here = Vector(at)
    r = width * 0.62                          # wider than the opening below it: that is the horseshoe
    for nm, w, h, m, lift in (('Frame', width * 1.7, height * 1.22, frame, 0.0), (name, width, height - r, mat, 0.02)):
        o = box(nm, (w, 0.05, h), tuple(here + Vector((0, 0, h / 2)) + out * lift), m, bevel=0)
        o.rotation_euler = (0, 0, turn)
    bpy.ops.mesh.primitive_cylinder_add(vertices=28, radius=r, depth=0.05,
                                        location=tuple(here + Vector((0, 0, height - r)) + out * 0.035),   # just proud of the door below it
                                        rotation=(math.radians(90), 0, turn))
    bpy.context.active_object.data.materials.append(mat)


def ring_roof(outer, inner, eave, rise, mat):
    """a tiled roof round a courtyard: from its ridge it slopes down to the outside and down into the yard.
    `outer` and `inner` are the (width, depth) of its outer and inner edges, `eave` their height."""
    (ow, od), (iw, idp) = outer, inner
    bm = bmesh.new()

    def loop(w, d, z):
        return [bm.verts.new((sx * w / 2, sy * d / 2, z)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]

    out, ridge, inn = loop(ow, od, eave), loop((ow + iw) / 2, (od + idp) / 2, eave + rise), loop(iw, idp, eave)
    for k in range(4):
        j = (k + 1) % 4
        bm.faces.new((out[k], out[j], ridge[j], ridge[k]))
        bm.faces.new((ridge[k], ridge[j], inn[j], inn[k]))
        bm.faces.new((out[j], out[k], inn[k], inn[j]))            # the underside
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new('Roof')
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new('Roof', me)
    bpy.context.scene.collection.objects.link(o)
    o.data.materials.append(mat)
    return o


def riad():
    """a riad: a large whitewashed house built round a courtyard, under red tiled roofs (the dars have green), with
    a roof terrace tower at one corner, a cedar gate under a tiled porch and a fountain in the yard. It is the dar's
    big sibling, so a riad and the dars beside it look like one town."""
    scene = stage()
    wall = material('Lime wash', '#f4ecdc', 0.75)
    stone = material('Stone', '#d2bd94', 0.8)
    tiles = material('Red tiles', '#b8322a', 0.5)        # red roofs, where the dars have green: a riad is told apart at a glance
    wood = material('Cedar', '#4a2a17', 0.6)
    brass = material('Brass', '#e3b34a', 0.3)
    pool = material('Pool', '#2ea7b9', 0.15)
    paving = material('Paving', '#e9dcc0', 0.8)

    W, D, H = 3.3, 2.9, 1.25           # the house: across, front to back, wall height
    CW, CD = 1.5, 1.15                 # the courtyard
    walls = box('Walls', (W, D, H), (0, 0, H / 2), wall, bevel=0)
    cut(walls, box('Yard', (CW, CD, H), (0, 0, 0.45 + H / 2), wall, bevel=0))
    box('Footing', (W + 0.1, D + 0.1, 0.14), (0, 0, 0.07), stone, bevel=0.02)
    box('Yard floor', (CW, CD, 0.04), (0, 0, 0.47), paving, bevel=0)
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.3, depth=0.08, location=(0, 0, 0.53))        # the fountain
    bpy.context.active_object.data.materials.append(wall)
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.22, depth=0.09, location=(0, 0, 0.535))
    bpy.context.active_object.data.materials.append(pool)

    ring_roof((W + 0.26, D + 0.26), (CW - 0.24, CD - 0.24), H, 0.46, tiles)

    # the tower on the back left corner, with its own pointed roof
    tx, ty, th = -W / 2 + 0.55, D / 2 - 0.55, 2.35
    box('Tower', (1.0, 1.0, th), (tx, ty, th / 2), wall, bevel=0.02)
    box('Tower eaves', (1.24, 1.24, 0.1), (tx, ty, th + 0.05), tiles, bevel=0.02)
    pyramid('Tower roof', 1.24, 0.66, (tx, ty, th + 0.1), tiles)
    finial((tx, ty, th + 0.8), brass)
    horseshoe('Tower window', 0.24, 0.46, (tx, ty - 0.52, 1.62), wood, stone)
    horseshoe('Tower window', 0.24, 0.46, (tx + 0.52, ty, 1.62), wood, stone, facing='right')

    # the gate: cedar doors in a stone frame, under a small tiled porch
    horseshoe('Gate', 0.6, 0.92, (0.15, -D / 2 - 0.02, 0.14), wood, stone)
    slab('Porch', (1.15, 0.42, 0.07), (0.15, -D / 2 - 0.16, 1.22), tiles, (-24, 0, 0))
    for x in (-1.05, 1.25):
        horseshoe('Window', 0.24, 0.4, (x, -D / 2 - 0.02, 0.58), wood, stone)
    for y in (-0.8, 0.15, 1.0):
        horseshoe('Window', 0.24, 0.4, (W / 2 + 0.02, y, 0.58), wood, stone, facing='right')
    shoot(scene, 'riad', (0.5, 0, 1.2), 6.2)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    dar()
    riad()
