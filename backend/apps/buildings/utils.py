import os
import subprocess
import tempfile
from django.core.files.base import ContentFile

def optimize_glb(uploaded_file):
    """
    Takes a Django UploadedFile (.glb).
    Uses gltf-transform to safely read (even if Draco), decimate geometry (20%),
    join meshes, and re-apply Draco compression in one clean pipeline.
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
        # We apply Draco compression to ensure tiny file sizes.
        cmd = [
            'gltf-transform', 'optimize', 
            temp_in_path, temp_out_path, 
            '--compress', 'draco', 
            '--simplify', 'false',
            '--texture-compress', 'false'
        ]
        
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
        
        if proc.returncode != 0:
            print("gltf-transform failed:", proc.stderr.decode('utf-8'))
            if os.path.exists(temp_in_path): os.remove(temp_in_path)
            if os.path.exists(temp_out_path): os.remove(temp_out_path)
            return uploaded_file
            
        with open(temp_out_path, 'rb') as f:
            optimized_data = f.read()
            
        if os.path.exists(temp_in_path): os.remove(temp_in_path)
        if os.path.exists(temp_out_path): os.remove(temp_out_path)
        
        new_file = ContentFile(optimized_data, name=uploaded_file.name)
        print(f"GLTF Pipeline Success: {uploaded_file.size / 1024 / 1024:.2f}MB -> {len(optimized_data) / 1024 / 1024:.2f}MB")
        return new_file
        
    except Exception as e:
        print("Error during GLB optimization:", str(e))
        return uploaded_file