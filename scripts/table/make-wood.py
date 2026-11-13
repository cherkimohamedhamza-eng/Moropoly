# Renders the wooden table top the board sits on: public/assets/wood.webp (via scripts/.renders/wood.png and
# scripts/finish-renders.mjs).
#
#   blender -b -P scripts/table/make-wood.py        (npm run wood)
#
# A flat board of dark walnut planks, seen straight from above under a soft light from the upper left:
# the planks and their grain are made by the material below, no picture files are used.
import math
import os

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', '.renders', 'wood.png'))
W, H = 2000, 1300
PLANKS = 7


def graphics_card(scene):
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


def walnut():
    m = bpy.data.materials.new('Walnut')
    m.use_nodes = True
    n, link = m.node_tree.nodes, m.node_tree.links.new
    bsdf = n.get('Principled BSDF')
    bsdf.inputs['Roughness'].default_value = 0.34
    if 'Coat Weight' in bsdf.inputs:                       # a thin varnish
        bsdf.inputs['Coat Weight'].default_value = 0.35
        bsdf.inputs['Coat Roughness'].default_value = 0.18

    co = n.new('ShaderNodeTexCoord')
    xyz = n.new('ShaderNodeSeparateXYZ')
    link(co.outputs['Object'], xyz.inputs['Vector'])

    # which plank a point is on: planks run left to right, one above the other
    row = n.new('ShaderNodeMath'); row.operation = 'MULTIPLY'; row.inputs[1].default_value = PLANKS / 2
    link(xyz.outputs['Y'], row.inputs[0])
    plank = n.new('ShaderNodeMath'); plank.operation = 'FLOOR'
    link(row.outputs[0], plank.inputs[0])
    within = n.new('ShaderNodeMath'); within.operation = 'FRACT'
    link(row.outputs[0], within.inputs[0])
    chance = n.new('ShaderNodeTexWhiteNoise'); chance.noise_dimensions = '1D'
    link(plank.outputs[0], chance.inputs['W'])

    # the grain: noise stretched along the plank, shifted by a different amount on each plank
    shift = n.new('ShaderNodeCombineXYZ')
    slide = n.new('ShaderNodeMath'); slide.operation = 'MULTIPLY'; slide.inputs[1].default_value = 37
    link(chance.outputs['Value'], slide.inputs[0])
    link(slide.outputs[0], shift.inputs['X']); link(slide.outputs[0], shift.inputs['Z'])
    moved = n.new('ShaderNodeVectorMath'); moved.operation = 'ADD'
    link(co.outputs['Object'], moved.inputs[0]); link(shift.outputs['Vector'], moved.inputs[1])
    stretch = n.new('ShaderNodeMapping'); stretch.inputs['Scale'].default_value = (0.55, 9.0, 1.0)
    link(moved.outputs['Vector'], stretch.inputs['Vector'])
    grain = n.new('ShaderNodeTexNoise')
    grain.inputs['Scale'].default_value = 6.0; grain.inputs['Detail'].default_value = 12.0
    grain.inputs['Roughness'].default_value = 0.62; grain.inputs['Distortion'].default_value = 1.6
    link(stretch.outputs['Vector'], grain.inputs['Vector'])
    fine = n.new('ShaderNodeTexNoise')                      # the fine pores
    fine.inputs['Scale'].default_value = 3.0; fine.inputs['Detail'].default_value = 6.0
    finemap = n.new('ShaderNodeMapping'); finemap.inputs['Scale'].default_value = (4.0, 180.0, 1.0)
    link(moved.outputs['Vector'], finemap.inputs['Vector']); link(finemap.outputs['Vector'], fine.inputs['Vector'])

    tone = n.new('ShaderNodeValToRGB')
    stops = tone.color_ramp.elements
    stops[0].position, stops[0].color = 0.28, (0.028, 0.012, 0.005, 1)
    stops[1].position, stops[1].color = 0.74, (0.19, 0.085, 0.032, 1)
    mid = stops.new(0.5); mid.color = (0.085, 0.036, 0.014, 1)
    link(grain.outputs['Fac'], tone.inputs['Fac'])

    # each plank a little lighter or darker than its neighbours, pores a touch darker, the gaps between planks dark
    per = n.new('ShaderNodeMapRange'); per.inputs['To Min'].default_value = 0.72; per.inputs['To Max'].default_value = 1.2
    link(chance.outputs['Value'], per.inputs['Value'])
    pores = n.new('ShaderNodeMapRange'); pores.inputs['To Min'].default_value = 0.78; pores.inputs['To Max'].default_value = 1.12
    link(fine.outputs['Fac'], pores.inputs['Value'])
    gap = n.new('ShaderNodeMapRange')                       # 0 in the gap, 1 on the plank
    gap.inputs['From Min'].default_value = 0.0; gap.inputs['From Max'].default_value = 0.012; gap.clamp = True
    edge = n.new('ShaderNodeMath'); edge.operation = 'PINGPONG'; edge.inputs[1].default_value = 0.5
    link(within.outputs[0], edge.inputs[0]); link(edge.outputs[0], gap.inputs['Value'])
    a = n.new('ShaderNodeMath'); a.operation = 'MULTIPLY'; link(per.outputs['Result'], a.inputs[0]); link(pores.outputs['Result'], a.inputs[1])
    b = n.new('ShaderNodeMath'); b.operation = 'MULTIPLY'; link(a.outputs[0], b.inputs[0])
    lift = n.new('ShaderNodeMapRange'); lift.inputs['To Min'].default_value = 0.18; lift.inputs['To Max'].default_value = 1.0
    link(gap.outputs['Result'], lift.inputs['Value']); link(lift.outputs['Result'], b.inputs[1])
    colour = n.new('ShaderNodeMix'); colour.data_type = 'RGBA'; colour.blend_type = 'MULTIPLY'; colour.inputs['Factor'].default_value = 1
    grey = n.new('ShaderNodeCombineColor')
    for ch in ('Red', 'Green', 'Blue'):
        link(b.outputs[0], grey.inputs[ch])
    link(tone.outputs['Color'], colour.inputs['A']); link(grey.outputs['Color'], colour.inputs['B'])
    link(colour.outputs['Result'], bsdf.inputs['Base Color'])

    bump = n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.12; bump.inputs['Distance'].default_value = 0.02
    height = n.new('ShaderNodeMath'); height.operation = 'MULTIPLY'
    link(grain.outputs['Fac'], height.inputs[0]); link(gap.outputs['Result'], height.inputs[1])
    link(height.outputs[0], bump.inputs['Height']); link(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return m


if __name__ == '__main__':
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    graphics_card(scene)
    scene.cycles.samples = 192
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = W, H
    scene.render.image_settings.file_format = 'PNG'
    scene.view_settings.view_transform = 'Standard'

    bpy.ops.mesh.primitive_plane_add(size=2)
    top = bpy.context.active_object
    top.scale = (W / H * 1.02, 1.02, 1)
    top.data.materials.append(walnut())

    world = bpy.data.worlds.new('Room'); world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.9, 0.82, 0.72, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.35
    scene.world = world
    bpy.ops.object.light_add(type='AREA', location=(-1.6, 1.4, 3.2))      # a lamp over the upper left of the table
    lamp = bpy.context.active_object
    lamp.data.energy = 420; lamp.data.size = 3.0; lamp.data.color = (1.0, 0.9, 0.78)
    lamp.rotation_euler = (math.radians(-18), math.radians(-22), 0)

    bpy.ops.object.camera_add(location=(0, 0, 10))
    cam = bpy.context.active_object
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = 2 * W / H
    scene.camera = cam
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    scene.render.filepath = OUT
    bpy.ops.render.render(write_still=True)
    print('saved', OUT)
