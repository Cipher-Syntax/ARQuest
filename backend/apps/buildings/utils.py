import os
import struct
import json
import subprocess
import tempfile
from django.core.files.base import ContentFile

def clean_and_enhance_gltf_json(glb_bytes):
    """
    Parses a GLB byte stream:
    1. Sets doubleSided=True on ALL materials (fixes missing backfaces).
    2. Enforces alphaMode='OPAQUE' on all solid materials (fixes transparent walls/roofs).
    3. Cleans up non-standard extensions so mobile ViroReact standard PBR renders flawlessly.
    """
    if len(glb_bytes) < 12:
        return glb_bytes
        
    magic, version, length = struct.unpack_from('<4sII', glb_bytes, 0)
    if magic != b'glTF' or version != 2:
        return glb_bytes
        
    offset = 12
    chunk0_length, chunk0_type = struct.unpack_from('<II', glb_bytes, offset)
    offset += 8
    
    if chunk0_type != 0x4E4F534A: # b'JSON'
        return glb_bytes
        
    json_bytes = glb_bytes[offset:offset + chunk0_length]
    offset += chunk0_length
    remaining_bytes = glb_bytes[offset:]
    
    try:
        gltf = json.loads(json_bytes.decode('utf-8'))
    except Exception as e:
        print("JSON parse error:", e)
        return glb_bytes
        
    materials = gltf.get('materials', [])
    for mat in materials:
        mat['doubleSided'] = True
        
        name = (mat.get('name') or '').lower()
        is_glass = any(k in name for k in ['glass', 'translucent', 'transparent', 'window'])
        
        if not is_glass:
            mat['alphaMode'] = 'OPAQUE'
            # Ensure pbrMetallicRoughness has solid baseColorFactor if not textured
            pbr = mat.get('pbrMetallicRoughness', {})
            if 'baseColorFactor' not in pbr and 'baseColorTexture' not in pbr:
                pbr['baseColorFactor'] = [0.8, 0.8, 0.8, 1.0]
            mat['pbrMetallicRoughness'] = pbr
        else:
            mat['alphaMode'] = 'BLEND'
            
        # Strip legacy specular-glossiness extension from individual materials
        if 'extensions' in mat and 'KHR_materials_pbrSpecularGlossiness' in mat.get('extensions', {}):
            del mat['extensions']['KHR_materials_pbrSpecularGlossiness']
            if not mat['extensions']:
                del mat['extensions']
            
    # Clean only legacy extensions from extensionsUsed/extensionsRequired, keeping Draco and standard extensions
    if 'extensionsUsed' in gltf:
        gltf['extensionsUsed'] = [ext for ext in gltf['extensionsUsed'] if ext != 'KHR_materials_pbrSpecularGlossiness']
    if 'extensionsRequired' in gltf:
        gltf['extensionsRequired'] = [ext for ext in gltf['extensionsRequired'] if ext != 'KHR_materials_pbrSpecularGlossiness']
            
    new_json_str = json.dumps(gltf, separators=(',', ':'))
    new_json_bytes = new_json_str.encode('utf-8')
    
    pad_len = (4 - (len(new_json_bytes) % 4)) % 4
    new_json_bytes += b' ' * pad_len
    
    new_chunk0_length = len(new_json_bytes)
    new_total_length = 12 + 8 + new_chunk0_length + len(remaining_bytes)
    
    header = struct.pack('<4sII', b'glTF', 2, new_total_length)
    chunk0_header = struct.pack('<II', new_chunk0_length, 0x4E4F534A)
    
    return header + chunk0_header + new_json_bytes + remaining_bytes

def optimize_glb(uploaded_file):
    """
    Takes a Django UploadedFile (.glb).
    1. Converts legacy SpecularGlossiness to standard PBR metallic-roughness.
    2. Ensures double-sided rendering on all materials.
    3. Guarantees solid opaque alpha mode for all walls, floors, and roofs.
    4. Outputs pure uncompressed GLB 2.0 compatible with native mobile AR and Web.
    """
    if not uploaded_file.name.lower().endswith('.glb'):
        return uploaded_file
        
    try:
        with tempfile.NamedTemporaryFile(suffix='.glb', delete=False) as temp_in:
            for chunk in uploaded_file.chunks():
                temp_in.write(chunk)
            temp_in_path = temp_in.name
            
        with open(temp_in_path, 'rb') as f:
            raw_data = f.read()
            
        # If the model is already Draco compressed or an optimized export, skip metalrough to prevent corrupting Draco stream
        if b'KHR_draco_mesh_compression' in raw_data or 'optimized' in uploaded_file.name.lower():
            enhanced_data = clean_and_enhance_gltf_json(raw_data)
            new_file = ContentFile(enhanced_data)
            new_file.name = uploaded_file.name
            if os.path.exists(temp_in_path):
                os.unlink(temp_in_path)
            return new_file

        temp_pbr_path = temp_in_path.replace('.glb', '_pbr.glb')
        
        # Step 1: Convert legacy specular-glossiness materials to standard glTF PBR
        cmd_pbr = ['gltf-transform', 'metalrough', temp_in_path, temp_pbr_path]
        subprocess.run(cmd_pbr, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
        
        src_path = temp_pbr_path if os.path.exists(temp_pbr_path) else temp_in_path
        
        with open(src_path, 'rb') as f:
            raw_data = f.read()
            
        # Step 2: Post-process JSON chunk (double-sided, opaque alphas, strip broken extensions)
        enhanced_data = clean_and_enhance_gltf_json(raw_data)
            
        new_file = ContentFile(enhanced_data)
        new_file.name = uploaded_file.name
        
        for p in [temp_in_path, temp_pbr_path]:
            if os.path.exists(p):
                os.unlink(p)
        
        return new_file
        
    except Exception as e:
        print(f"Exception during GLB optimization: {e}")
        return uploaded_file