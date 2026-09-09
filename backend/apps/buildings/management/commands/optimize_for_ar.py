import os
import io
import json
import struct
import tempfile
import urllib.request
from pathlib import Path
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from apps.buildings.models import Building
from apps.buildings.utils import clean_and_enhance_gltf_json
from apps.buildings.compressor import _run


class Command(BaseCommand):
    help = 'Batch optimizes and standardizes campus building 3D models for native ViroReact/ARCore 6DoF Spatial AR (Option A).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--building',
            type=str,
            help='Filter by building ID or substring in building name (e.g. "CCS" or "Computing")'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force re-optimization even if model already has no Draco or WebP'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Inspect and report candidate models without updating the database or storage'
        )

    def handle(self, *args, **options):
        filter_str = options.get('building')
        force = options.get('force', False)
        dry_run = options.get('dry_run', False)

        queryset = Building.objects.all().order_by('name')
        if filter_str:
            queryset = queryset.filter(name__icontains=filter_str) | queryset.filter(id__iexact=filter_str)

        buildings = list(queryset)
        self.stdout.write(self.style.SUCCESS("=== ARQuest Native Spatial AR Model Optimizer ==="))
        self.stdout.write(f"Targeting {len(buildings)} building facility records...\n")

        env = os.environ.copy()
        env['NODE_OPTIONS'] = '--max-old-space-size=8192'

        for b in buildings:
            if not b.model_file:
                self.stdout.write(self.style.NOTICE(f"[-] {b.name}: No 3D model attached. Skipping."))
                continue

            model_url = b.model_file.url
            self.stdout.write(self.style.HTTP_INFO(f"[*] Processing: {b.name}"))
            self.stdout.write(f"    Current URL: {model_url}")

            with tempfile.TemporaryDirectory(prefix=f"ar_opt_{b.id}_") as temp_dir:
                in_path = os.path.join(temp_dir, "input.glb")

                # Step 1: Download model from S3 / storage
                try:
                    self.stdout.write("    Fetching model data...")
                    urllib.request.urlretrieve(model_url, in_path)
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"    Failed to download model: {e}"))
                    continue

                orig_size = os.path.getsize(in_path)
                orig_size_mb = orig_size / (1024 * 1024)
                self.stdout.write(f"    Downloaded size: {orig_size_mb:.2f} MB")

                # Step 2: Inspect GLB header & JSON
                with open(in_path, 'rb') as f:
                    data = f.read()

                if len(data) < 20:
                    self.stdout.write(self.style.ERROR("    Corrupt or invalid GLB file."))
                    continue

                c_len, = struct.unpack_from('<I', data, 12)
                try:
                    j = json.loads(data[20:20 + c_len].decode('utf-8'))
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"    Failed to parse GLTF JSON: {e}"))
                    continue

                used = j.get('extensionsUsed', [])
                req = j.get('extensionsRequired', [])
                images = j.get('images', [])
                has_draco = 'KHR_draco_mesh_compression' in used or 'KHR_draco_mesh_compression' in req
                has_webp = any(img.get('mimeType') == 'image/webp' for img in images)

                self.stdout.write(f"    Header check -> Draco: {has_draco}, WebP: {has_webp}, Extensions: {req}")

                if not has_draco and not has_webp and not force and orig_size_mb < 25.0:
                    self.stdout.write(self.style.SUCCESS(f"    [OK] Model is already native ARCore/ViroReact compliant. No conversion needed.\n"))
                    continue

                if dry_run:
                    self.stdout.write(self.style.WARNING("    [Dry Run] Needs conversion. Skipping write.\n"))
                    continue

                current_path = in_path
                logs = []

                # Step 3: Decompress Draco if present
                if has_draco:
                    step_undraco = os.path.join(temp_dir, "undraco.glb")
                    self.stdout.write("    Decompressing Draco geometry into standard mesh buffers...")
                    rc = _run(['gltf-transform', 'copy', current_path, step_undraco], env, 'copy', logs, timeout=300)
                    if rc == 0 and os.path.exists(step_undraco) and os.path.getsize(step_undraco) > 0:
                        current_path = step_undraco
                        self.stdout.write(f"    [OK] Decompressed: {os.path.getsize(current_path) / (1024 * 1024):.2f} MB")
                    else:
                        self.stdout.write(self.style.ERROR("    Draco decompression failed."))
                        continue

                # Step 4: If mesh is dense or larger than 12MB, simplify polygons
                decomp_size_mb = os.path.getsize(current_path) / (1024 * 1024)
                if decomp_size_mb > 12.0:
                    self.stdout.write(f"    Decimating dense geometry ({decomp_size_mb:.2f} MB)...")
                    step_simp = os.path.join(temp_dir, "simplified.glb")
                    if decomp_size_mb > 100:
                        ratio = '0.04'
                    elif decomp_size_mb > 50:
                        ratio = '0.35'
                    else:
                        ratio = '0.5'
                    rc = _run([
                        'gltf-transform', 'simplify',
                        '--ratio', ratio,
                        '--error', '0.01',
                        current_path, step_simp
                    ], env, 'simplify', logs, timeout=600)
                    if rc == 0 and os.path.exists(step_simp) and os.path.getsize(step_simp) > 0:
                        current_path = step_simp
                        self.stdout.write(f"    [OK] Simplified to: {os.path.getsize(current_path) / (1024 * 1024):.2f} MB")

                # Step 5: Texture resizing if textures exceed 1024px
                step_resize = os.path.join(temp_dir, "resized.glb")
                rc = _run([
                    'gltf-transform', 'resize',
                    '--width', '1024',
                    '--height', '1024',
                    current_path, step_resize
                ], env, 'resize', logs, timeout=180)
                if rc == 0 and os.path.exists(step_resize) and os.path.getsize(step_resize) > 0:
                    current_path = step_resize

                # Step 6: Final Native AR Sanitation & WebP to standard JPEG/PNG conversion
                self.stdout.write("    Standardizing materials and textures (JPEG/PNG, Double-Sided PBR)...")
                with open(current_path, 'rb') as f:
                    raw_bytes = f.read()

                enhanced_bytes = clean_and_enhance_gltf_json(raw_bytes)
                final_size = len(enhanced_bytes)
                final_size_mb = final_size / (1024 * 1024)

                # Step 7: Save optimized model back to Building model_file
                filename = Path(b.model_file.name).name
                if not filename.endswith('.glb'):
                    filename += '.glb'

                clean_stem = Path(filename).stem.split('_')[0]
                new_filename = f"{clean_stem}_native_ar.glb"

                self.stdout.write(f"    Uploading native AR model ({final_size_mb:.2f} MB) to storage...")
                b.model_file.save(new_filename, ContentFile(enhanced_bytes), save=True)
                b.model_file_size = final_size
                b.save(update_fields=['model_file_size', 'updated_at'])

                self.stdout.write(self.style.SUCCESS(
                    f"    [OK] {b.name} successfully updated!\n"
                    f"      Original: {orig_size_mb:.2f} MB -> Native AR: {final_size_mb:.2f} MB\n"
                    f"      New URL: {b.model_file.url}\n"
                ))

        self.stdout.write(self.style.SUCCESS("=== Optimization Complete ==="))
