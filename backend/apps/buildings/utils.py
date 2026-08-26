import os
import subprocess
import tempfile
from django.core.files.base import ContentFile

def optimize_glb(uploaded_file):
    """
    Takes a Django UploadedFile (.glb).
    Uses gltf-transform to safely read, dedup, and join meshes.
    Draco compression is intentionally omitted to support Native AR (ViroReact) engines.
    """
    if not uploaded_file.name.lower().endswith('.glb'):
        return uploaded_file
        
    try:
        with tempfile.NamedTemporaryFile(suffix='.glb', delete=False) as temp_in:
            for chunk in uploaded_file.chunks():
                temp_in.write(chunk)
            temp_in_path = temp_in.name
            
        temp_out_path = temp_in_path.replace('.glb', '_opt.glb')
        
        # Option B (Surgical Draw Call Reduction):
        # We use 'optimize' to perform dedup, instancing, and joining meshes (fixing draw calls).
        # We EXPLICITLY disable '--simplify' so it never deletes a single polygon (prevents melting).
        # We disable '--texture-compress' to prevent libvips crashes on SketchUp textures.
        # We DO NOT apply Draco compression because ViroReact C++ engine lacks a Draco decoder.
        cmd = [
            'gltf-transform', 'optimize', 
            temp_in_path, temp_out_path, 
            '--simplify', 'false',
            '--texture-compress', 'false'
        ]
        
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
        
        if proc.returncode != 0:
            print("GLTF-Transform Error:", proc.stderr.decode('utf-8', errors='ignore'))
            os.unlink(temp_in_path)
            return uploaded_file
            
        with open(temp_out_path, 'rb') as f:
            optimized_data = f.read()
            
        new_file = ContentFile(optimized_data)
        new_file.name = uploaded_file.name
        
        os.unlink(temp_in_path)
        os.unlink(temp_out_path)
        
        return new_file
        
    except Exception as e:
        print(f"Exception during GLB optimization: {e}")
        return uploaded_file