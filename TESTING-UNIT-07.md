# Unit 07: 3D Visualization System - Testing Guide

## Implementation Complete ✅

All components of the 3D visualization system have been implemented and are ready for testing.

## Testing Steps

### 1. Backend Setup

1. Upload a 3D model (.glb or .gltf file) via Django admin:
   - Go to http://localhost:8000/admin/
   - Navigate to Buildings → Select a building
   - In the "3D Model" section:
     - Upload model_file (must be .glb or .gltf format)
     - Set model_version (e.g., "v1.0")
     - Set model_file_size (file size in bytes)
     - Check model_active to enable the model
   - Save the building

2. Verify API includes model data:
   - Visit: http://localhost:8000/api/buildings/unlocked/
   - Check that unlocked buildings include:
     - model_url (full URL to the model file)
     - model_version
     - model_file_size
     - model_active

### 2. Mobile Testing

1. Start the mobile app:
   ```
   cd mobile
   npx expo start
   ```

2. Login to the app with a user that has unlocked buildings

3. Navigate to the Buildings tab:
   - You should see unlocked buildings
   - Buildings with active 3D models show "View 3D Model" button
   - Buildings without models show "3D model not available"

4. Tap "View 3D Model":
   - The 3D viewer screen opens fullscreen
   - Shows "Loading 3D Model..." while loading
   - Model appears and can be interacted with:
     - Drag to rotate
     - Pinch to zoom
     - Model auto-centers in view
   - Back button in top-left returns to Buildings tab

### 3. Expected Behavior

**Loading States:**
- Initial: "Loading 3D Model..." with loading indicator
- Success: Model renders, loading indicator disappears
- Error: "Failed to load model" message if model URL invalid

**3D Interaction:**
- Smooth rotation via drag gestures
- Zoom via pinch gestures
- Model automatically fits to screen on load
- Lighting shows model details clearly

**Performance:**
- Pixel ratio limited to max 2x for mobile performance
- WebView isolates Three.js from React Native
- Resources disposed when exiting viewer

## Sample 3D Models

You can test with free .glb models from:
- https://sketchfab.com (filter by "Downloadable")
- https://github.com/KhronosGroup/glTF-Sample-Models

Recommended test models:
- Simple box or cube (quick loading test)
- Building model (realistic use case)

## Troubleshooting

**Model doesn't appear:**
- Check model_active is true in admin
- Verify model_url is accessible
- Check browser console in WebView for errors

**Slow loading:**
- Large model files (>10MB) take time
- Consider optimizing models with smaller file sizes

**No "View 3D Model" button:**
- Verify building is unlocked for the user
- Check model_active is true
- Ensure model_file is uploaded

## System Verification Checklist ✅

- [x] Backend model fields added and migrated
- [x] Serializers include 3D model metadata
- [x] Django admin supports 3D model upload
- [x] react-native-webview installed
- [x] Three.js viewer HTML created
- [x] Building3DViewerScreen implemented
- [x] ViewerHeader component created
- [x] Navigation from Buildings tab working
- [x] All backend tests passing (67 tests)
- [x] Progress tracker updated

## Next Steps

Test with actual building 3D models created in SketchUp or Blender and converted to .glb format.
