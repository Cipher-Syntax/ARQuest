import React, { useState, useEffect } from 'react';
import { Box, Image as ImageIcon, X } from 'lucide-react';
import { Card } from '../components/ui';
import { buildingService } from '../services/buildingService';
import { panoramaService } from '../services/panoramaService';
import '@google/model-viewer';
import { ReactPhotoSphereViewer } from 'react-photo-sphere-viewer';
import '@photo-sphere-viewer/core/index.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const getFullUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL}${url}`;
};

export default function Media() {
  const [buildings, setBuildings] = useState([]);
  const [viewTab, setViewTab] = useState('3d'); // '3d' or 'panorama'
  const [loading, setLoading] = useState(true);

  // Viewer state
  const [activeModel, setActiveModel] = useState(null); // building object
  const [activePanorama, setActivePanorama] = useState(null); // building object
  const [panoScenes, setPanoScenes] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await buildingService.getBuildings();
      setBuildings(data);
    } catch (error) {
      console.error('Error loading buildings:', error);
    } finally {
      setLoading(false);
    }
  };

  const open3DViewer = (building) => {
    setActiveModel(building);
  };

  const openPanoramaViewer = async (building) => {
    try {
      const scenes = await panoramaService.getBuildingScenes(building.id);
      if (scenes && scenes.length > 0) {
        setPanoScenes(scenes);
        setActivePanorama(building);
      } else {
        alert('No panorama scenes available for this building.');
      }
    } catch (error) {
      console.error('Error loading scenes', error);
      alert('Failed to load panorama scenes');
    }
  };

  const closeViewer = () => {
    setActiveModel(null);
    setActivePanorama(null);
    setPanoScenes([]);
  };

  const has3DModel = (b) => !!b.model_url;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Content & Media Viewer</h1>
          <p className="text-gray-500 mt-1">Interact with 3D models and panorama walkthroughs.</p>
        </div>
        <div className="flex bg-white p-1 rounded-lg border border-brand-border shadow-sm">
          <button
            onClick={() => setViewTab('3d')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-colors ${
              viewTab === '3d' ? 'bg-brand text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Box size={16} /> 3D Models
          </button>
          <button
            onClick={() => setViewTab('panorama')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-colors ${
              viewTab === 'panorama' ? 'bg-brand text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <ImageIcon size={16} /> Panorama Walkthroughs
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {buildings.map((b) => {
            const is3D = viewTab === '3d';
            
            // Only show buildings that might have the respective content
            if (is3D && !has3DModel(b)) return null;

            return (
              <Card 
                key={b.id} 
                className="group cursor-pointer hover:border-brand hover:shadow-xl transition-all duration-300"
                onClick={() => is3D ? open3DViewer(b) : openPanoramaViewer(b)}
              >
                <div className="aspect-video bg-gray-100 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
                  {is3D ? (
                    <div className="w-full h-full pointer-events-none">
                      <model-viewer
                        src={getFullUrl(b.model_url)}
                        auto-rotate="true"
                        camera-controls="false"
                        interaction-prompt="none"
                        shadow-intensity="1"
                        style={{ width: '100%', height: '100%', backgroundColor: '#f3f4f6' }}
                      />
                    </div>
                  ) : (
                    <ImageIcon size={48} className="text-brand/30 group-hover:scale-110 transition-transform duration-500" />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 bg-white/90 backdrop-blur-sm text-brand font-bold text-sm px-4 py-2 rounded-full transition-all transform translate-y-4 group-hover:translate-y-0 shadow-lg">
                      {is3D ? 'Interact in 3D' : 'View Panoramas'}
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 truncate">{b.name}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{b.description || 'No description available'}</p>
                </div>
              </Card>
            );
          })}
          
          {buildings.filter(b => viewTab === '3d' ? has3DModel(b) : true).length === 0 && (
            <div className="col-span-full h-48 flex items-center justify-center text-gray-400 bg-gray-50 border-2 border-dashed border-brand-border rounded-xl font-bold">
              No {viewTab === '3d' ? '3D models' : 'panoramas'} found.
            </div>
          )}
        </div>
      )}

      {/* Full Screen Viewer Modal */}
      {(activeModel || activePanorama) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/90 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="relative w-full max-w-6xl h-[85vh] bg-black rounded-2xl shadow-2xl overflow-hidden border border-white/10 flex flex-col">
            <div className="absolute top-4 right-4 z-50 flex gap-2">
              <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white font-bold text-sm flex items-center gap-2">
                {activeModel ? <Box size={16} /> : <ImageIcon size={16} />}
                {(activeModel || activePanorama).name}
              </div>
              <button 
                onClick={closeViewer} 
                className="bg-black/50 backdrop-blur-md p-2 rounded-full border border-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 w-full h-full relative">
              {activeModel && (
                <model-viewer
                  src={getFullUrl(activeModel.model_url)}
                  auto-rotate="true"
                  camera-controls="true"
                  ar="true"
                  shadow-intensity="1"
                  style={{ width: '100%', height: '100%', backgroundColor: '#111' }}
                />
              )}

              {activePanorama && panoScenes.length > 0 && (
                <ReactPhotoSphereViewer
                  src={getFullUrl(panoScenes[0].image_url)}
                  height={'100%'}
                  width={'100%'}
                  littlePlanet={true}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
