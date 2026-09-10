import io
import os
import struct
import json
import subprocess
import tempfile
from PIL import Image
from django.core.files.base import ContentFile

def clean_and_enhance_gltf_json(glb_bytes, max_texture_size=1024):
    """
    Parses a GLB byte stream and ensures 100% compliance with native ViroReact/ARCore:
    1. Converts any embedded WebP textures to standard baseline JPEG/PNG (resolves native stb_image failure).
    2. Downscales oversized embedded textures (>max_texture_size) and converts opaque RGBA to compact JPEG.
    3. Re-links texture sources if EXT_texture_webp was used, and removes EXT_texture_webp.
    4. If no mesh primitive uses KHR_draco_mesh_compression, cleans it from extensionsUsed and extensionsRequired.
    5. Sets doubleSided=True on ALL materials (fixes missing backfaces in AR).
    6. Enforces alphaMode='OPAQUE' on all solid materials (fixes transparent walls/roofs).
    7. Strips legacy specular-glossiness and unsupported extensions.
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
    
    try:
        gltf = json.loads(json_bytes.decode('utf-8'))
    except Exception as e:
        print("JSON parse error:", e)
        return glb_bytes

    # --- Material enhancements ---
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

    # --- Check for WebP textures or heavy/oversized textures ---
    images = gltf.get('images', [])
    buffer_views = gltf.get('bufferViews', [])
    has_webp = any(img.get('mimeType') == 'image/webp' for img in images)
    
    has_heavy_image = False
    for img in images:
        bv_idx = img.get('bufferView')
        if bv_idx is not None and bv_idx < len(buffer_views):
            if buffer_views[bv_idx].get('byteLength', 0) > 300 * 1024:
                has_heavy_image = True
                break

    needs_image_processing = (has_webp or has_heavy_image) and offset < len(glb_bytes)

    # Check if KHR_draco_mesh_compression is actually used in any mesh primitive
    has_draco_primitives = False
    for mesh in gltf.get('meshes', []):
        for prim in mesh.get('primitives', []):
            if 'KHR_draco_mesh_compression' in prim.get('extensions', {}):
                has_draco_primitives = True
                break
        if has_draco_primitives:
            break

    if not needs_image_processing and offset < len(glb_bytes):
        # Clean extensions when no image conversion/downscaling is needed
        if not has_draco_primitives:
            if 'extensionsUsed' in gltf:
                gltf['extensionsUsed'] = [x for x in gltf['extensionsUsed'] if x not in ('KHR_draco_mesh_compression', 'EXT_texture_webp', 'KHR_materials_pbrSpecularGlossiness')]
            if 'extensionsRequired' in gltf:
                gltf['extensionsRequired'] = [x for x in gltf['extensionsRequired'] if x not in ('KHR_draco_mesh_compression', 'EXT_texture_webp', 'KHR_materials_pbrSpecularGlossiness')]
        else:
            if 'extensionsUsed' in gltf:
                gltf['extensionsUsed'] = [x for x in gltf['extensionsUsed'] if x not in ('EXT_texture_webp', 'KHR_materials_pbrSpecularGlossiness')]
            if 'extensionsRequired' in gltf:
                gltf['extensionsRequired'] = [x for x in gltf['extensionsRequired'] if x not in ('EXT_texture_webp', 'KHR_materials_pbrSpecularGlossiness')]

        new_json_str = json.dumps(gltf, separators=(',', ':'))
        new_json_bytes = new_json_str.encode('utf-8')
        pad_len = (4 - (len(new_json_bytes) % 4)) % 4
        new_json_bytes += b' ' * pad_len
        
        remaining_bytes = glb_bytes[offset:]
        new_chunk0_length = len(new_json_bytes)
        new_total_length = 12 + 8 + new_chunk0_length + len(remaining_bytes)
        
        header = struct.pack('<4sII', b'glTF', 2, new_total_length)
        chunk0_header = struct.pack('<II', new_chunk0_length, 0x4E4F534A)
        return header + chunk0_header + new_json_bytes + remaining_bytes

    # If needs_image_processing: optimize textures with Pillow and rebuild BIN chunk
    if needs_image_processing and offset < len(glb_bytes):
        chunk1_length, chunk1_type = struct.unpack_from('<II', glb_bytes, offset)
        offset += 8
        bin_data = bytearray(glb_bytes[offset:offset + chunk1_length])
        
        new_bin = bytearray()
        target_max = max_texture_size if (max_texture_size and max_texture_size > 0) else 1024
        
        for i, bv in enumerate(buffer_views):
            bv_offset = bv.get('byteOffset', 0)
            bv_length = bv.get('byteLength', 0)
            chunk = bin_data[bv_offset:bv_offset + bv_length]
            
            target_img = None
            for img in images:
                if img.get('bufferView') == i:
                    target_img = img
                    break
                    
            if target_img:
                is_webp = (target_img.get('mimeType') == 'image/webp')
                try:
                    im = Image.open(io.BytesIO(chunk))
                    orig_len = len(chunk)
                    
                    # 1. Downscale if dimensions exceed target_max
                    if im.width > target_max or im.height > target_max:
                        im.thumbnail((target_max, target_max), Image.Resampling.LANCZOS)
                    
                    # 2. Check if alpha channel actually has transparency
                    has_transparency = False
                    if im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info):
                        if im.mode == 'P':
                            im = im.convert('RGBA')
                        try:
                            alpha = im.split()[-1]
                            min_a, max_a = alpha.getextrema()
                            if min_a < 250:
                                has_transparency = True
                        except Exception:
                            has_transparency = True
                            
                    out_buf = io.BytesIO()
                    if has_transparency:
                        im.save(out_buf, format='PNG', optimize=True)
                        target_img['mimeType'] = 'image/png'
                    else:
                        im.convert('RGB').save(out_buf, format='JPEG', quality=85, optimize=True)
                        target_img['mimeType'] = 'image/jpeg'
                        
                    optimized_chunk = out_buf.getvalue()
                    if len(optimized_chunk) < orig_len or is_webp:
                        new_chunk = optimized_chunk
                    else:
                        new_chunk = chunk
                except Exception as e:
                    print("Image optimization notice:", e)
                    new_chunk = chunk
            else:
                new_chunk = chunk
                
            pad = (4 - (len(new_bin) % 4)) % 4
            if pad:
                new_bin.extend(b'\x00' * pad)
                
            new_offset = len(new_bin)
            new_bin.extend(new_chunk)
            
            bv['byteOffset'] = new_offset
            bv['byteLength'] = len(new_chunk)
            
        pad = (4 - (len(new_bin) % 4)) % 4
        if pad:
            new_bin.extend(b'\x00' * pad)
            
        if 'buffers' in gltf and len(gltf['buffers']) > 0:
            gltf['buffers'][0]['byteLength'] = len(new_bin)
            
        # Re-link texture source from EXT_texture_webp to root source
        for tex in gltf.get('textures', []):
            if 'extensions' in tex and 'EXT_texture_webp' in tex['extensions']:
                src = tex['extensions']['EXT_texture_webp'].get('source')
                if 'source' not in tex and src is not None:
                    tex['source'] = src
                del tex['extensions']['EXT_texture_webp']
                if not tex['extensions']:
                    del tex['extensions']
                    
        # Remove EXT_texture_webp and phantom Draco from extensions
        extensions_to_remove = {'EXT_texture_webp', 'KHR_materials_pbrSpecularGlossiness'}
        if not has_draco_primitives:
            extensions_to_remove.add('KHR_draco_mesh_compression')
            
        if 'extensionsUsed' in gltf:
            gltf['extensionsUsed'] = [x for x in gltf['extensionsUsed'] if x not in extensions_to_remove]
        if 'extensionsRequired' in gltf:
            gltf['extensionsRequired'] = [x for x in gltf['extensionsRequired'] if x not in extensions_to_remove]
            
        new_json_str = json.dumps(gltf, separators=(',', ':'))
        new_json_bytes = new_json_str.encode('utf-8')
        j_pad = (4 - (len(new_json_bytes) % 4)) % 4
        if j_pad:
            new_json_bytes += b' ' * j_pad
            
        new_total = 12 + 8 + len(new_json_bytes) + 8 + len(new_bin)
        out_glb = struct.pack('<4sII', b'glTF', 2, new_total)
        out_glb += struct.pack('<II', len(new_json_bytes), 0x4E4F534A) + new_json_bytes
        out_glb += struct.pack('<II', len(new_bin), 0x004E4942) + new_bin
        return out_glb

    return glb_bytes

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