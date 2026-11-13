# Models the game's die in Blender and saves it as public/assets/die.glb.
#
#   blender -b -P scripts/dice/make-die.py            (npm run dice)
#   blender -b -P scripts/dice/make-die.py -- --preview out.png   also renders a picture to check it
#
# The die is a cube 2 units across with rounded edges and drilled pips. Which way each number faces
# (Blender's axes, Z up) is fixed here and relied on by src/ui/dice3d.js:
#   1 +Z   6 -Z   2 +X   5 -X   3 +Y   4 -Y        (opposite faces add up to 7)
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', '..', 'public', 'assets', 'die.glb'))

BEVEL = 0.24          # how round the edges are
BEVEL_SEGMENTS = 5
STEP = 0.5            # distance between pips on a face
PIP = (0.25, 0.10)    # a pip is a ball of this radius sunk this deep
PIP_ONE = (0.40, 0.13)  # the single pip of the 1 is bigger, and red
RING, STACKS = 20, 10   # how finely the pips are rounded

# number -> (direction the face points, the two directions across the face)
FACES = {
    1: (Vector((0, 0, 1)), Vector((1, 0, 0)), Vector((0, 1, 0))),
    6: (Vector((0, 0, -1)), Vector((1, 0, 0)), Vector((0, -1, 0))),
    2: (Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))),
    5: (Vector((-1, 0, 0)), Vector((0, -1, 0)), Vector((0, 0, 1))),
    3: (Vector((0, 1, 0)), Vector((-1, 0, 0)), Vector((0, 0, 1))),
    4: (Vector((0, -1, 0)), Vector((1, 0, 0)), Vector((0, 0, 1))),
}
# where the pips sit on a 3 x 3 grid, as (across, up) steps from the middle
LAYOUT = {
    1: [(0, 0)],
    2: [(-1, 1), (1, -1)],
    3: [(-1, 1), (0, 0), (1, -1)],
    4: [(-1, 1), (1, 1), (-1, -1), (1, -1)],
    5: [(-1, 1), (1, 1), (0, 0), (-1, -1), (1, -1)],
    6: [(-1, 1), (1, 1), (-1, 0), (1, 0), (-1, -1), (1, -1)],
}


def material(name, colour, roughness, coat=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*colour, 1)
    b.inputs['Roughness'].default_value = roughness
    b.inputs['Metallic'].default_value = 0
    if coat and 'Coat Weight' in b.inputs:
        b.inputs['Coat Weight'].default_value = coat
        b.inputs['Coat Roughness'].default_value = 0.08
    return m


def srgb(hex_colour):
    """a #rrggbb colour as the linear values Blender wants"""
    c = [int(hex_colour[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)

    bpy.ops.mesh.primitive_cube_add(size=2)
    die = bpy.context.active_object
    die.name = 'Die'
    bevel = die.modifiers.new('Bevel', 'BEVEL')
    bevel.width = BEVEL
    bevel.segments = BEVEL_SEGMENTS
    bevel.limit_method = 'ANGLE'
    bpy.ops.object.modifier_apply(modifier=bevel.name)

    # one ball per pip, all joined into the shape that gets cut out of the cube
    pips = []   # (centre of the ball, radius, face direction, opening radius, is the 1)
    balls = []
    for n, (normal, u, v) in FACES.items():
        radius, depth = PIP_ONE if n == 1 else PIP
        for a, b in LAYOUT[n]:
            centre = normal * (1 + radius - depth) + u * (a * STEP) + v * (b * STEP)
            bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, segments=RING, ring_count=STACKS, location=centre)
            balls.append(bpy.context.active_object)
            pips.append((centre, radius, normal, math.sqrt(radius ** 2 - (radius - depth) ** 2), n == 1))
    bpy.ops.object.select_all(action='DESELECT')
    for b in balls:
        b.select_set(True)
    bpy.context.view_layer.objects.active = balls[0]
    bpy.ops.object.join()
    cutter = bpy.context.active_object

    bpy.ops.object.select_all(action='DESELECT')
    die.select_set(True)
    bpy.context.view_layer.objects.active = die
    cut = die.modifiers.new('Pips', 'BOOLEAN')
    cut.operation = 'DIFFERENCE'
    cut.object = cutter
    cut.solver = 'EXACT'
    bpy.ops.object.modifier_apply(modifier=cut.name)
    bpy.data.objects.remove(cutter, do_unlink=True)

    # materials: ivory body, dark pips, the red pip of the 1
    die.data.materials.clear()
    die.data.materials.append(material('Ivory', srgb('#f6f2e9'), 0.28, coat=0.6))
    die.data.materials.append(material('Pip', srgb('#191c22'), 0.42))
    die.data.materials.append(material('PipRed', srgb('#c1272d'), 0.38))

    bm = bmesh.new()
    bm.from_mesh(die.data)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    counts = [0, 0, 0]
    for f in bm.faces:
        c = f.calc_center_median()
        f.material_index = 0
        for centre, radius, normal, opening, one in pips:
            height = c.dot(normal)
            if height < 0.5 or height > 1 - 0.003:   # another side of the cube, or the flat face itself
                continue
            across = (c - normal * height) - (centre - normal * centre.dot(normal))
            if across.length < opening + 0.004:
                f.material_index = 2 if one else 1
                break
        counts[f.material_index] += 1
        f.smooth = True
    # round where the surface curves gently, crisp at the rim of each pip
    for e in bm.edges:
        e.smooth = len(e.link_faces) == 2 and e.calc_face_angle(0) < math.radians(38)
    bm.to_mesh(die.data)
    bm.free()
    die.data.update()
    print(f'die: {len(die.data.polygons)} triangles (body {counts[0]}, pips {counts[1]}, red pip {counts[2]})')
    return die


def export(die):
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    die.select_set(True)
    bpy.context.view_layer.objects.active = die
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_apply=True,
                              export_yup=True, export_texcoords=False, export_animations=False)
    print(f'saved {OUT} ({os.path.getsize(OUT) / 1024:.0f} KB)')


def preview(die, path):
    """two dice on a green table, rendered with Cycles, to look at the model"""
    scene = bpy.context.scene
    other = die.copy()
    other.data = die.data
    scene.collection.objects.link(other)
    die.location = (-1.5, 0, 1)
    die.rotation_euler = (0, 0, math.radians(-24))                        # 1 on top
    other.location = (1.5, 0.2, 1)
    other.rotation_euler = (math.radians(90), 0, math.radians(200))       # another number on top

    bpy.ops.mesh.primitive_plane_add(size=40)
    table = bpy.context.active_object
    table.data.materials.append(material('Felt', srgb('#0b4a2c'), 0.9))

    bpy.ops.object.light_add(type='AREA', location=(-4, -3, 7))
    key = bpy.context.active_object
    key.data.energy = 900
    key.data.size = 5
    key.rotation_euler = (math.radians(25), math.radians(-30), 0)
    world = bpy.data.worlds.new('World')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.6, 0.7, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.5
    scene.world = world

    bpy.ops.object.camera_add(location=(0, -6.2, 8.6))
    cam = bpy.context.active_object
    cam.data.lens = 42
    look = Vector((0, 0.1, 0.9)) - cam.location
    cam.rotation_euler = look.to_track_quat('-Z', 'Y').to_euler()
    scene.camera = cam

    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 96
    scene.cycles.device = 'CPU'
    scene.render.resolution_x, scene.render.resolution_y = 900, 520
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print(f'preview {path}')


if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    the_die = build()
    export(the_die)
    if '--preview' in args:
        preview(the_die, os.path.abspath(args[args.index('--preview') + 1]))
