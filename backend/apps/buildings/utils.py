import os
import struct
import json
import subprocess
import tempfile
from django.core.files.base import ContentFile

def fix_glb_materials(glb_bytes):
    """
    Parses a GLB byte stream:
    1. Sets doubleSided=True on all materials so inverted/single-sided faces in SketchUp
       render fully from both sides.
    2. Fixes SketchUp alphaMode='MASK' bug on opaque architectural materials (roofs, walls,
       concrete) by setting alphaMode='OPAQUE', preventing mobile OpenGL shaders from punching
       holes through solid faces.
    """
    if len(glb_bytes) < 12:
        return glb_bytes
        
    magic, version, length = struct.unpack_from('<4sII', glb_bytes, 0)
    if magic != b'glTF' or version != 2:
        return glb_bytes
        
    offset = 12
    # Read Chunk 0 (JSON)
    chunk0_length, chunk0_type = struct.unpack_from('<II', glb_bytes, offset)
    offset += 8
    
    if chunk0_type != 0x4E4F534A: # b'JSON'
        return glb_bytes
        
    json_bytes = glb_bytes[offset:offset + chunk0_length]
    offset += chunk0_length
    
    # Rest of the file (Chunk 1 BIN, etc.)
    remaining_bytes = glb_bytes[offset:]
    
    try:
        gltf = json.loads(json_bytes.decode('utf-8'))
    except Exception as e:
        print("JSON parse error:", e)
        return glb_bytes
        
    materials = gltf.get('materials', [])
    if not materials:
        gltf['materials'] = [{'doubleSided': True, 'alphaMode': 'OPAQUE'}]
    else:
        for mat in materials:
            # Always ensure double-sided rendering for complete architectural geometry
            mat['doubleSided'] = True
            
            name = (mat.get('name') or '').lower()
            is_glass = 'glass' in name or 'translucent' in name or 'transparent' in name or 'window' in name
            
            if not is_glass:
                # If it's a solid architectural material (brick, wood, metal, concrete, roof),
                # force OPAQUE so mobile shader alpha masking never culls solid faces.
                mat['alphaMode'] = 'OPAQUE'
            else:
                mat['alphaMode'] = 'BLEND'
            
    # Serialize updated JSON
    new_json_str = json.dumps(gltf, separators=(',', ':'))
    new_json_bytes = new_json_str.encode('utf-8')
    
    # Pad to 4-byte boundary with spaces (0x20) per glTF 2.0 specification
    pad_len = (4 - (len(new_json_bytes) % 4)) % 4
    new_json_bytes += b' ' * pad_len
    
    new_chunk0_length = len(new_json_bytes)
    new_total_length = 12 + 8 + new_chunk0_length + len(remaining_bytes)
    
    # Pack new header and chunk 0
    header = struct.pack('<4sII', b'glTF', 2, new_total_length)
    chunk0_header = struct.pack('<II', new_chunk0_length, 0x4E4F534A)
    
    return header + chunk0_header + new_json_bytes + remaining_bytes

def optimize_glb(uploaded_file):
    """
    Takes a Django UploadedFile (.glb).
    Uses gltf-transform to safely read, dedup, and join meshes.
    Applies double-sided and solid opacity material patches for mobile AR rendering.
    Draco and Meshopt compression are EXPLICITLY disabled to support Native AR (ViroReact) engines.
    """
    if not uploaded_file.name.lower().endswith('.glb'):
        return uploaded_file
        
    try:
        with tempfile.NamedTemporaryFile(suffix='.glb', delete=False) as temp_in:
            for chunk in uploaded_file.chunks():
                temp_in.write(chunk)
            temp_in_path = temp_in.name
            
        temp_out_path = temp_in_path.replace('.glb', '_opt.glb')
        
        # We use 'optimize' to perform dedup, instancing, and joining meshes.
        # We EXPLICITLY disable '--simplify', '--texture-compress', and '--compress'
        cmd = [
            'gltf-transform', 'optimize', 
            temp_in_path, temp_out_path, 
            '--compress', 'false',
            '--simplify', 'false',
            '--texture-compress', 'false'
        ]
        
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
        
        target_path = temp_out_path if proc.returncode == 0 else temp_in_path
            
        with open(target_path, 'rb') as f:
            raw_data = f.read()
            
        # Post-process materials to guarantee doubleSided and solid opaque rendering in mobile AR
        enhanced_data = fix_glb_materials(raw_data)
            
        new_file = ContentFile(enhanced_data)
        new_file.name = uploaded_file.name
        
        if os.path.exists(temp_in_path):
            os.unlink(temp_in_path)
        if os.path.exists(temp_out_path):
            os.unlink(temp_out_path)
        
        return new_file
        
    except Exception as e:
        print(f"Exception during GLB optimization: {e}")
        return uploaded_file