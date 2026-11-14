import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Trophy, Eye, ChevronRight, Smartphone, Camera, Navigation, Layers, Monitor, Target, ShieldCheck, Cuboid, Crosshair, ChevronDown, Building2, X } from 'lucide-react';
import Map, { Marker, Source, Layer, NavigationControl } from 'react-map-gl/mapbox';
import circle from '@turf/circle';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@google/model-viewer';
import { useAuth } from '../hooks/useAuth';
import { useBranding } from '../context/BrandingContext';
import { buildingService } from '../services/buildingService';
import { navigationService } from '../services/navigationService';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const WMSU_CENTER = { lat: 6.9122, lng: 122.0605 };

const DEFAULT_CAMPUS_PERIMETER = [
    [122.0570, 6.9092],
    [122.0570, 6.9162],
    [122.0655, 6.9162],
    [122.0655, 6.9092],
    [122.0570, 6.9092],
];

// Prevent Mapbox telemetry requests that trigger ad-blocker ERR_BLOCKED_BY_CLIENT
try {
    if (mapboxgl && mapboxgl.config) {
        Object.defineProperty(mapboxgl.config, 'EVENTS_URL', {
            value: null,
            writable: true,
            configurable: true,
        });
    }
} catch {}

const FadeUp = ({ children, delay = 0 }) => {
    const [isVisible, setIsVisible] = useState(false);
    const domRef = useRef();

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsVisible(true);
                        observer.unobserve(entry.target); // Only animate once
                    }
                });
            },
            { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
        );

        const currentRef = domRef.current;
        if (currentRef) observer.observe(currentRef);
        return () => {
            if (currentRef) observer.unobserve(currentRef);
        };
    }, []);

    return (
        <div
            ref={domRef}
            className={`transition-all duration-1000 ease-out transform ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
            }`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
};

const CountUp = ({ end, suffix = "", duration = 2000 }) => {
    const [count, setCount] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const domRef = useRef();

    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                setIsVisible(true);
                observer.unobserve(domRef.current);
            }
        });
        if (domRef.current) observer.observe(domRef.current);
        return () => {
            if (domRef.current) observer.unobserve(domRef.current);
        }
    }, []);

    useEffect(() => {
        if (!isVisible) return;
        let startTime;
        const step = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            setCount(Math.floor(progress * end));
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }, [isVisible, end, duration]);

    return <span ref={domRef}>{count.toLocaleString()}{suffix}</span>;
};

const FAQItem = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-gray-200 py-4">
            <button 
                className="flex w-full items-center justify-between text-left font-bold text-gray-900 focus:outline-none"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="text-lg">{question}</span>
                <ChevronDown className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#8A1538]' : 'text-gray-400'}`} size={20} />
            </button>
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'max-h-40 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                <p className="text-gray-600 leading-relaxed">{answer}</p>
            </div>
        </div>
    );
};

const LandingPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { appName, logoUrl } = useBranding();
    const [buildings, setBuildings] = useState([]);
    const [buildingsLoading, setBuildingsLoading] = useState(true);
    const [selectedBuilding, setSelectedBuilding] = useState(null);
    const mapRef = useRef(null);
    const [perimeter, setPerimeter] = useState({
        coordinates: DEFAULT_CAMPUS_PERIMETER,
        fill_color: '#111827',
        fill_opacity: 0.65,
        stroke_color: '#B21830',
        stroke_width: 2.5,
    });

    // Auto-redirect to dashboard if token is active
    useEffect(() => {
        if (user) {
            navigate('/dashboard', { replace: true });
        }
    }, [user, navigate]);

    // Fetch buildings and campus perimeter for the Digital Twin map
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [data, perimeterRes] = await Promise.all([
                    buildingService.getPublicBuildings(),
                    navigationService.getPublicPerimeter().catch(() => null),
                ]);
                // Filter to active, visible buildings with coordinates
                const filtered = data.filter(b =>
                    b.is_active &&
                    b.status === 'VISIBLE' &&
                    b.latitude &&
                    b.longitude
                );
                setBuildings(filtered);
                if (
                    perimeterRes &&
                    Array.isArray(perimeterRes.coordinates) &&
                    perimeterRes.coordinates.length >= 3
                ) {
                    setPerimeter((prev) => ({ ...prev, ...perimeterRes }));
                }
            } catch (err) {
                console.warn('Failed to load buildings for landing page map:', err);
            } finally {
                setBuildingsLoading(false);
            }
        };
        fetchData();
    }, []);

    // Geofence circles (same green styling as the Campus Map page)
    const circlesGeojson = useMemo(() => {
        const features = [];
        buildings.forEach((b) => {
            const geofences = Array.isArray(b.geofences) ? b.geofences : [];
            geofences.forEach((geo) => {
                const lat = parseFloat(geo.latitude);
                const lng = parseFloat(geo.longitude);
                const radius = parseFloat(geo.radius_meters) || 20;
                if (!lat || !lng) return;
                try {
                    const poly = circle([lng, lat], radius, {
                        steps: 64,
                        units: 'meters',
                    });
                    poly.properties = {
                        id: geo.id,
                        name: b.name,
                        active: geo.is_active !== false,
                    };
                    features.push(poly);
                } catch {
                    // ignore invalid circle geometry
                }
            });
        });
        return { type: 'FeatureCollection', features };
    }, [buildings]);

    // Inverted campus mask (dark outside) + crimson dashed boundary
    const perimeterMaskGeojson = useMemo(() => ({
        type: 'FeatureCollection',
        features: [{
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'Polygon',
                coordinates: [
                    [[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]],
                    perimeter.coordinates,
                ],
            },
        }],
    }), [perimeter.coordinates]);

    const perimeterStrokeGeojson = useMemo(() => ({
        type: 'FeatureCollection',
        features: [{
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: perimeter.coordinates,
            },
        }],
    }), [perimeter.coordinates]);

    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans overflow-x-hidden selection:bg-[#8A1538] selection:text-white">
            
            {/* Apple-Style Header (Ultra-thin, frosted glass, centered links) */}
            <nav className="fixed top-0 inset-x-0 z-50 bg-white/70 backdrop-blur-xl border-b border-gray-200/50">
                <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between text-xs font-semibold tracking-wide text-gray-800">
                    <Link to="/" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                        <img src={logoUrl} alt={`${appName} Logo`} className="w-5 h-5 object-contain" />
                        <span className="font-bold">{appName}</span>
                    </Link>
                    
                    <div className="hidden md:flex gap-8">
                        <a href="#map" className="hover:text-brand transition-colors">Map</a>
                        <a href="#ecosystem" className="hover:text-brand transition-colors">Ecosystem</a>
                        <a href="#features" className="hover:text-brand transition-colors">Features</a>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="max-w-7xl mx-auto px-8 pt-32 pb-24 flex flex-col md:flex-row items-center gap-12 relative">
                <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-bl from-red-50/80 to-transparent -z-10 rounded-bl-md"></div>

                <div className="flex-1 space-y-8 z-10">

                    <FadeUp delay={100}>
                        <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-tight text-gray-900">
                            Your Campus, <br />
                            <span className="text-[#8A1538]">Fully Unlocked.</span>
                        </h1>
                    </FadeUp>
                    
                    <FadeUp delay={200}>
                        <p className="text-xl text-gray-600 max-w-lg leading-relaxed font-medium">
                            Step into the university's digital layer. ARQuest combines Mapbox GPS, 3D visualization, and trivia into one exploration app.
                        </p>
                    </FadeUp>
                    
                    <FadeUp delay={300}>
                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <button className="flex items-center justify-center gap-2 px-8 py-4 rounded-md bg-[#8A1538] hover:bg-[#5E0202] text-white font-bold text-lg transition-all shadow-[0_8px_20px_rgba(138,21,56,0.3)] hover:-translate-y-1">
                                <Smartphone size={20} />
                                Download App
                            </button>
                            <a href="#ecosystem" className="flex items-center justify-center gap-2 px-8 py-4 rounded-md bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 text-gray-800 font-bold text-lg transition-all">
                                Discover Features
                                <ChevronRight size={20} />
                            </a>
                        </div>
                    </FadeUp>
                </div>

                <div className="flex-1 relative z-10 w-full max-w-sm mx-auto mt-12 md:mt-0">
                    <FadeUp delay={200}>
                        <div className="absolute inset-0 bg-[#8A1538] rounded-[3rem] blur-3xl opacity-10 animate-pulse"></div>
                        
                        {/* Phone Mockup Frame */}
                        <div className="relative border-[8px] border-gray-900 bg-white rounded-[3rem] shadow-2xl aspect-[9/19] overflow-hidden transform md:-rotate-2 hover:rotate-0 hover:-translate-y-2 transition-transform duration-700 ring-1 ring-gray-900/5">
                            <div className="absolute top-0 inset-x-0 h-6 bg-gray-900 w-1/2 mx-auto rounded-b-xl z-20"></div>
                            <img 
                                src="/app-preview.jpg" 
                                alt="ARQuest App Preview" 
                                className="w-full h-full object-cover relative z-10"
                            />
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 text-gray-400 z-0">
                                <Smartphone size={48} className="mb-4 opacity-50" />
                                <p className="text-sm px-8 text-center">app-preview.jpg</p>
                            </div>
                        </div>
                    </FadeUp>
                </div>
            </section>

            {/* Infinite Marquee Ecosystem Banner */}
            <section className="border-y border-gray-100 bg-gray-50 overflow-hidden py-8">
                <div className="flex w-[200%] animate-marquee">
                    {/* Duplicate the list so the marquee loops without a gap */}
                    {[1, 2].map((set) => (
                        <div key={set} className="flex-1 flex justify-around items-center px-6">
                            <span className="text-gray-500 font-bold tracking-widest uppercase text-sm whitespace-nowrap">College of Computing Studies</span>
                            <span className="text-gray-300">✦</span>
                            <span className="text-gray-500 font-bold tracking-widest uppercase text-sm whitespace-nowrap">College of Engineering</span>
                            <span className="text-gray-300">✦</span>
                            <span className="text-gray-500 font-bold tracking-widest uppercase text-sm whitespace-nowrap">University Library</span>
                            <span className="text-gray-300">✦</span>
                            <span className="text-gray-500 font-bold tracking-widest uppercase text-sm whitespace-nowrap">College of Science</span>
                            <span className="text-gray-300">✦</span>
                            <span className="text-gray-500 font-bold tracking-widest uppercase text-sm whitespace-nowrap">College of Architecture</span>
                            <span className="text-gray-300">✦</span>
                            <span className="text-gray-500 font-bold tracking-widest uppercase text-sm whitespace-nowrap">WMSU Grandstand</span>
                            <span className="text-gray-300">✦</span>
                            <span className="text-gray-500 font-bold tracking-widest uppercase text-sm whitespace-nowrap">College of Nursing</span>
                            <span className="text-gray-300">✦</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Stats & Scale Counters */}
            <section className="bg-gray-900 py-16 border-b border-gray-800">
                <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-gray-800">
                    <div className="flex flex-col items-center justify-center py-4">
                        <div className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">
                            <CountUp end={10} suffix="+" />
                        </div>
                        <p className="text-gray-400 font-semibold tracking-wide uppercase text-sm">Buildings Mapped</p>
                    </div>
                    <div className="flex flex-col items-center justify-center py-4">
                        <div className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">
                            <CountUp end={1000} suffix="+" />
                        </div>
                        <p className="text-gray-400 font-semibold tracking-wide uppercase text-sm">Interactive Quests</p>
                    </div>
                    <div className="flex flex-col items-center justify-center py-4">
                        <div className="text-4xl md:text-5xl font-black text-[#8A1538] mb-2 tracking-tight">
                            <CountUp end={360} suffix="°" />
                        </div>
                        <p className="text-gray-400 font-semibold tracking-wide uppercase text-sm">Remote Walkthroughs</p>
                    </div>
                </div>
            </section>

            {/* Editorial Split Section (Campus Image) */}
            <section className="py-24 bg-white relative">
                <div className="max-w-7xl mx-auto px-8 flex flex-col lg:flex-row items-center gap-16">
                    {/* Left: Typography */}
                    <div className="flex-1 space-y-6">
                        <FadeUp delay={100}>
                            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 leading-[1.1]">
                                Built exclusively for <br/>
                                <span className="text-[#8A1538]">Western Mindanao State University.</span>
                            </h2>
                        </FadeUp>
                        <FadeUp delay={200}>
                            <p className="text-lg text-gray-600 font-medium leading-relaxed max-w-lg">
                                ARQuest connects physical heritage with digital innovation. 
                                It turns WMSU's historic architecture and grounds into an interactive spatial experience.
                            </p>
                        </FadeUp>
                    </div>

                    {/* Right: Campus Image */}
                    <div className="flex-1 w-full">
                        <FadeUp delay={300}>
                            <div className="relative group">
                                {/* Decorative backdrop offset */}
                                <div className="absolute inset-0 bg-[#8A1538] translate-x-4 translate-y-4 rounded-md -z-10 opacity-10 group-hover:translate-x-5 group-hover:translate-y-5 transition-transform duration-500"></div>
                                
                                {/* Fallback container that stays behind the image, visible only if image fails to load */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 text-gray-400 -z-0 rounded-md border border-gray-200">
                                    <Camera size={48} className="mb-4 opacity-50" />
                                    <p className="text-sm px-8 text-center font-bold tracking-widest uppercase">wmsu-campus.jpg</p>
                                </div>

                                {/* Actual Image */}
                                <img 
                                    src="/wmsu-campus.jpg" 
                                    alt="WMSU Campus Building" 
                                    className="w-full aspect-[4/3] object-cover rounded-md shadow-lg ring-1 ring-gray-900/5 relative z-10"
                                />
                            </div>
                        </FadeUp>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-24 bg-gray-50 border-t border-gray-100 relative">
                <div className="max-w-7xl mx-auto px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">How It Works</h2>
                        <p className="text-gray-500 mt-4 max-w-2xl mx-auto font-medium">Your physical campus, synced with your digital dashboard.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                        {/* Connecting Line */}
                        <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gray-200 -z-10"></div>
                        
                        {/* Step 1 */}
                        <FadeUp delay={100}>
                            <div className="flex flex-col items-center text-center bg-white p-8 rounded-2xl shadow-sm border border-gray-100 h-full relative">
                                <div className="w-16 h-16 bg-[#8A1538]/10 text-[#8A1538] rounded-full flex items-center justify-center mb-6 ring-8 ring-gray-50">
                                    <Smartphone size={28} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">1. Open the Scanner</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">Launch the ARQuest mobile app and activate your camera to scan your surroundings.</p>
                            </div>
                        </FadeUp>

                        {/* Step 2 */}
                        <FadeUp delay={200}>
                            <div className="flex flex-col items-center text-center bg-white p-8 rounded-2xl shadow-sm border border-gray-100 h-full relative">
                                <div className="w-16 h-16 bg-[#8A1538]/10 text-[#8A1538] rounded-full flex items-center justify-center mb-6 ring-8 ring-gray-50">
                                    <Crosshair size={28} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">2. Enter a Geofence</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">Walk into designated campus zones to trigger location-based events automatically.</p>
                            </div>
                        </FadeUp>

                        {/* Step 3 */}
                        <FadeUp delay={300}>
                            <div className="flex flex-col items-center text-center bg-white p-8 rounded-2xl shadow-sm border border-gray-100 h-full relative">
                                <div className="w-16 h-16 bg-[#8A1538] text-white rounded-full flex items-center justify-center mb-6 ring-8 ring-gray-50 shadow-md shadow-[#8A1538]/20">
                                    <Cuboid size={28} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">3. Unlock Discoveries</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">Gain EXP, answer trivia, and interact with 3D architectural models of the buildings.</p>
                            </div>
                        </FadeUp>
                    </div>
                </div>
            </section>

            {/* Interactive 3D Showcase */}
            <section className="py-24 bg-white border-t border-gray-100 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center gap-16">
                    <div className="flex-1 space-y-6">
                        <FadeUp>
                            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
                                True Spatial <br/> <span className="text-[#8A1538]">Understanding.</span>
                            </h2>
                        </FadeUp>
                        <FadeUp delay={100}>
                            <p className="text-lg text-gray-600 font-medium leading-relaxed max-w-lg">
                                Don't just read about the campus, experience it. ARQuest renders lightweight, high-fidelity 3D models in your browser or phone. Rotate, zoom, and inspect architecture before you step inside.
                            </p>
                        </FadeUp>
                        <FadeUp delay={200}>
                            <div className="flex items-center gap-2 text-sm font-bold text-[#8A1538] bg-[#8A1538]/10 w-max px-4 py-2 rounded-full">
                                <Monitor size={16} /> Fully Interactive. Try spinning it!
                            </div>
                        </FadeUp>
                    </div>
                    <div className="flex-1 w-full flex justify-center mt-12 md:mt-0">
                        <div className="w-[300px] h-[300px] md:w-[450px] md:h-[450px] flex items-center justify-center relative">
                            {/* model-viewer web component */}
                            <model-viewer 
                                src="/models/WMSU_Admin.glb" 
                                alt="3D WMSU Building Model" 
                                auto-rotate="true" 
                                camera-controls="true"
                                style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, zIndex: 10, display: 'block', backgroundColor: 'transparent' }}
                                shadow-intensity="1"
                                exposure="1"
                            >
                            </model-viewer>
                        </div>
                    </div>
                </div>
            </section>

            {/* Big Map Section - Digital Twin */}
            <section id="map" className="py-32 bg-gray-50 border-y border-gray-200/50 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-8 relative z-10 text-center mb-16">
                    <FadeUp>
                        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-6">The Digital Twin.</h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto font-medium leading-relaxed">
                            Navigate a live 3D replica of the WMSU campus. Each marker is a real building from the system. Tap any marker to inspect its 3D model.
                        </p>
                    </FadeUp>
                </div>
                
                <FadeUp delay={200}>
                    <div className="w-full">
                        <div className="h-[60vh] md:h-[80vh] w-full bg-[#E5E7EB] border-y border-gray-300 relative group">
                            <Map
                                ref={mapRef}
                                mapboxAccessToken={MAPBOX_TOKEN}
                                initialViewState={{
                                    longitude: WMSU_CENTER.lng,
                                    latitude: WMSU_CENTER.lat,
                                    zoom: 17,
                                    pitch: 35,
                                    bearing: 0,
                                }}
                                style={{ width: '100%', height: '100%' }}
                                mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
                                interactive={true}
                                reuseMaps
                            >
                                <NavigationControl position="top-right" />

                                {/* Campus boundary: dark mask outside + crimson dashed outline */}
                                <Source id="campus-perimeter-mask" type="geojson" data={perimeterMaskGeojson}>
                                    <Layer
                                        id="campus-mask-fill"
                                        type="fill"
                                        paint={{
                                            'fill-color': perimeter.fill_color,
                                            'fill-opacity': perimeter.fill_opacity,
                                        }}
                                    />
                                </Source>
                                <Source id="campus-perimeter-stroke" type="geojson" data={perimeterStrokeGeojson}>
                                    <Layer
                                        id="campus-boundary-line"
                                        type="line"
                                        paint={{
                                            'line-color': perimeter.stroke_color,
                                            'line-width': perimeter.stroke_width,
                                            'line-dasharray': [3, 2],
                                        }}
                                    />
                                </Source>

                                {/* Geofence circles: green when active, gray when inactive */}
                                <Source id="landing-geofences" type="geojson" data={circlesGeojson}>
                                    <Layer
                                        id="landing-geofences-fill"
                                        type="fill"
                                        paint={{
                                            'fill-color': [
                                                'case',
                                                ['==', ['get', 'active'], true],
                                                '#10b981',
                                                '#6b7280',
                                            ],
                                            'fill-opacity': 0.22,
                                        }}
                                    />
                                    <Layer
                                        id="landing-geofences-line"
                                        type="line"
                                        paint={{
                                            'line-color': [
                                                'case',
                                                ['==', ['get', 'active'], true],
                                                '#10b981',
                                                '#6b7280',
                                            ],
                                            'line-width': 2,
                                        }}
                                    />
                                </Source>

                                {buildingsLoading ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                                        <div className="text-center">
                                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#8A1538] border-t-transparent mx-auto mb-3"></div>
                                            <p className="text-gray-600 font-medium">Loading campus buildings...</p>
                                        </div>
                                    </div>
                                ) : buildings.length > 0 ? (
                                    buildings.map((building) => {
                                        const lat = parseFloat(building.latitude);
                                        const lng = parseFloat(building.longitude);
                                        if (isNaN(lat) || isNaN(lng)) return null;
                                        const isSelected = selectedBuilding?.id === building.id;

                                        return (
                                            <Marker
                                                key={building.id}
                                                longitude={lng}
                                                latitude={lat}
                                                anchor="bottom"
                                            >
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedBuilding(building);
                                                        mapRef.current?.flyTo({
                                                            center: [lng, lat],
                                                            zoom: 18,
                                                            duration: 800,
                                                        });
                                                    }}
                                                    className="flex flex-col items-center cursor-pointer select-none group"
                                                >
                                                    <div
                                                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/95 backdrop-blur-md border text-slate-900 font-bold text-[10.5px] shadow-md tracking-tight mb-1 transition-all ${
                                                            isSelected
                                                                ? 'border-[#8A1538] ring-2 ring-[#8A1538]/30 shadow-lg scale-105'
                                                                : 'border-slate-200 group-hover:border-slate-400'
                                                        }`}
                                                    >
                                                        <span
                                                            className="w-2 h-2 rounded-full shrink-0"
                                                            style={{
                                                                backgroundColor:
                                                                    building.primary_department?.color_hex ||
                                                                    '#B21830',
                                                            }}
                                                        />
                                                        <span className="truncate max-w-[130px]">
                                                            {building.name}
                                                        </span>
                                                    </div>
                                                    <div className="relative flex items-center justify-center">
                                                        <div
                                                            className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${
                                                                isSelected
                                                                    ? 'bg-[#8A1538] scale-125'
                                                                    : 'bg-slate-700'
                                                            }`}
                                                        />
                                                    </div>
                                                </div>
                                            </Marker>
                                        );
                                    })
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                                        <p className="text-gray-500 text-center px-8">No buildings configured yet.</p>
                                    </div>
                                )}

                            </Map>

                            {/* Selected building 3D preview panel */}
                            {selectedBuilding && (
                                <div className="absolute top-24 right-6 z-20 w-72 max-w-[calc(100%-3rem)] max-h-[calc(100%-7.5rem)] overflow-y-auto bg-white rounded-md shadow-xl border border-gray-200">
                                    <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-gray-100">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-gray-900 leading-tight truncate">
                                                {selectedBuilding.name}
                                            </p>
                                            {selectedBuilding.primary_department && (
                                                <p className="text-[#8A1538] text-[11px] font-semibold mt-0.5 truncate">
                                                    {selectedBuilding.primary_department.name}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedBuilding(null)}
                                            className="shrink-0 w-6 h-6 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center"
                                            aria-label="Close preview"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>

                                    <div className="h-52 bg-gray-900 relative">
                                        {selectedBuilding.model_url ? (
                                            <model-viewer
                                                src={selectedBuilding.model_url}
                                                alt={`3D model of ${selectedBuilding.name}`}
                                                auto-rotate="true"
                                                camera-controls="true"
                                                shadow-intensity="1"
                                                exposure="1"
                                                style={{ width: '100%', height: '100%', backgroundColor: '#111827' }}
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 px-4 text-center">
                                                <Cuboid size={28} className="mb-2 opacity-60" />
                                                <p className="text-xs font-semibold">No 3D model available</p>
                                            </div>
                                        )}
                                    </div>

                                    {selectedBuilding.description && (
                                        <p className="px-4 py-3 text-xs text-gray-500 leading-snug max-h-20 overflow-y-auto">
                                            {selectedBuilding.description}
                                        </p>
                                    )}
                                </div>
                            )}
                            
                            {/* Map UI Overlay */}
                            <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-sm border border-gray-200 px-4 py-2 rounded-md shadow-sm font-bold text-sm text-gray-800">
                                <Building2 size={14} className="inline-block mr-1 -mt-0.5 text-[#8A1538]" />
                                {buildings.length} buildings loaded
                            </div>
                            <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-sm border border-gray-200 px-3 py-2 rounded-md shadow-sm text-[11px] font-semibold text-gray-700 flex items-center gap-3">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /> Active geofence
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#6b7280]" /> Inactive
                                </span>
                            </div>
                        </div>
                    </div>
                </FadeUp>
            </section>

            {/* Mobile vs Web Ecosystem Section */}
            <section id="ecosystem" className="py-32 bg-white">
                <div className="max-w-7xl mx-auto px-8">
                    <FadeUp>
                        <div className="text-center mb-24">
                            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-6">
                                Two Interfaces.<br/><span className="text-[#8A1538]">One Ecosystem.</span>
                            </h2>
                        </div>
                    </FadeUp>

                    <div className="grid md:grid-cols-2 gap-20">
                        {/* Mobile Column */}
                        <div className="space-y-10">
                            <FadeUp delay={100}>
                                <div className="flex items-center gap-3 mb-6">
                                    <Smartphone className="text-[#8A1538]" size={32} />
                                    <div className="text-sm font-extrabold tracking-widest text-[#8A1538] uppercase">For Students & Explorers</div>
                                </div>
                                <h3 className="text-3xl font-extrabold text-gray-900">The Mobile App</h3>
                                <p className="text-gray-600 text-lg leading-relaxed font-medium mt-4">
                                    Turn your smartphone into a campus lens. Designed for on-the-ground engagement, exploration, and augmented reality.
                                </p>
                            </FadeUp>
                            
                            <FadeUp delay={200}>
                                <ul className="space-y-8">
                                    <li className="flex gap-5 items-start">
                                        <div className="mt-1 bg-red-50 p-3 rounded-md text-[#8A1538]"><Navigation size={24} /></div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-xl mb-1">Live Mapbox Routing</h4>
                                            <p className="text-gray-600 leading-relaxed">Get precise, turn-by-turn directions to any building on campus using highly accurate 3D map data.</p>
                                        </div>
                                    </li>
                                    <li className="flex gap-5 items-start">
                                        <div className="mt-1 bg-red-50 p-3 rounded-md text-[#8A1538]"><Target size={24} /></div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-xl mb-1">GPS Quests & Trivia</h4>
                                            <p className="text-gray-600 leading-relaxed">Walk into specific geofenced zones to automatically unlock building history and interactive quizzes.</p>
                                        </div>
                                    </li>
                                    <li className="flex gap-5 items-start">
                                        <div className="mt-1 bg-red-50 p-3 rounded-md text-[#8A1538]"><Camera size={24} /></div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-xl mb-1">AR Scavenger Hunts</h4>
                                            <p className="text-gray-600 leading-relaxed">Locate hidden markers across campus to spawn 3D objects and collect rare achievements.</p>
                                        </div>
                                    </li>
                                </ul>
                            </FadeUp>
                        </div>

                        {/* Web Column */}
                        <div className="space-y-10">
                            <FadeUp delay={300}>
                                <div className="flex items-center gap-3 mb-6">
                                    <Monitor className="text-gray-400" size={32} />
                                    <div className="text-sm font-extrabold tracking-widest text-gray-500 uppercase">For Admins & Accreditors</div>
                                </div>
                                <h3 className="text-3xl font-extrabold text-gray-900">The Web Dashboard</h3>
                                <p className="text-gray-600 text-lg leading-relaxed font-medium mt-4">
                                    A command center for managing the digital campus from anywhere. No physical presence required.
                                </p>
                            </FadeUp>

                            <FadeUp delay={400}>
                                <ul className="space-y-8">
                                    <li className="flex gap-5 items-start">
                                        <div className="mt-1 bg-gray-100 p-3 rounded-md text-gray-700"><Layers size={24} /></div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-xl mb-1">Content Management</h4>
                                            <p className="text-gray-600 leading-relaxed">Update building information, upload lightweight 3D models, and write trivia questions instantly.</p>
                                        </div>
                                    </li>
                                    <li className="flex gap-5 items-start">
                                        <div className="mt-1 bg-gray-100 p-3 rounded-md text-gray-700"><Eye size={24} /></div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-xl mb-1">360° Virtual Tours</h4>
                                            <p className="text-gray-600 leading-relaxed">Accreditors can navigate indoor A-Frame panoramic tours without stepping foot on campus.</p>
                                        </div>
                                    </li>
                                    <li className="flex gap-5 items-start">
                                        <div className="mt-1 bg-gray-100 p-3 rounded-md text-gray-700"><Trophy size={24} /></div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-xl mb-1">Player Analytics</h4>
                                            <p className="text-gray-600 leading-relaxed">Monitor which buildings are most visited, track student EXP progress, and view global leaderboards.</p>
                                        </div>
                                    </li>
                                </ul>
                            </FadeUp>
                        </div>
                    </div>
                </div>
            </section>

            {/* Engagement & Advertisement Section (Bento Grid) */}
            <section id="features" className="py-24 bg-gray-50 border-t border-gray-200/50">
                <div className="max-w-7xl mx-auto px-8">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        
                        {/* Bento 1: Proximity Engine (Large) */}
                        <div className="md:col-span-8 bg-white border border-gray-200 rounded-md p-10 flex flex-col justify-center relative overflow-hidden group hover:border-[#8A1538]/30 transition-colors shadow-sm">
                            <div className="absolute -right-10 -top-10 text-gray-100 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-700">
                                <MapPin size={250} strokeWidth={1} />
                            </div>
                            <FadeUp delay={100}>
                                <div className="inline-block px-3 py-1.5 bg-gray-50 border border-gray-200 text-[#8A1538] text-xs font-extrabold tracking-widest uppercase rounded-md mb-6 shadow-sm">
                                    Proximity Engine
                                </div>
                                <h3 className="text-3xl font-extrabold text-gray-900 mb-4 leading-tight">Walk inside.<br/>Unlock the building.</h3>
                                <p className="text-gray-600 text-lg max-w-md font-medium leading-relaxed">
                                    No manual check-ins. ARQuest uses a calibrated Mapbox GPS system. Cross the boundary of a campus building, and your app unlocks exclusive 3D models and trivia facts.
                                </p>
                            </FadeUp>
                        </div>

                        {/* Bento 2: Gamification (Tall) */}
                        <div className="md:col-span-4 bg-[#8A1538] rounded-md p-10 flex flex-col justify-between text-white relative overflow-hidden shadow-lg group">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#8A1538] to-[#5E0202] -z-10"></div>
                            <div className="absolute bottom-0 right-0 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
                            
                            <FadeUp delay={200}>
                                <Trophy size={40} className="mb-6 text-[#00E5FF]" />
                                <h3 className="text-2xl font-extrabold mb-4">Climb the Leaderboard</h3>
                                <p className="text-red-100 text-base font-medium mb-8 leading-relaxed">
                                    Maintain daily streaks, conquer exploration quests, and answer location-based trivia to earn EXP.
                                </p>
                                
                                {/* Mock UI Element */}
                                <div className="bg-white/10 rounded-md p-5 backdrop-blur-md border border-white/20 shadow-inner mt-auto">
                                    <div className="flex justify-between items-end mb-3">
                                        <div>
                                            <div className="text-xs text-red-200 font-bold uppercase tracking-wider mb-1">Current Rank</div>
                                            <div className="font-extrabold text-lg flex items-center gap-1">⛺ SCOUT (Lv.3)</div>
                                        </div>
                                        <div className="text-[#00E5FF] font-bold text-lg">+150 EXP</div>
                                    </div>
                                    <div className="h-2.5 bg-black/30 rounded-md overflow-hidden">
                                        <div className="h-full bg-[#00E5FF] w-[75%] rounded-md"></div>
                                    </div>
                                </div>
                            </FadeUp>
                        </div>

                    </div>
                </div>
            </section>

            {/* Interactive FAQ */}
            <section className="py-24 bg-gray-50 border-t border-gray-200">
                <div className="max-w-3xl mx-auto px-8">
                    <div className="text-center mb-16">
                        <FadeUp>
                            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Frequently Asked Questions</h2>
                        </FadeUp>
                    </div>
                    <div className="space-y-2">
                        <FadeUp delay={100}>
                            <FAQItem 
                                question="Do I need a high-end smartphone to use ARQuest?" 
                                answer="Not at all. The 3D models and geofencing systems are highly optimized to run smoothly on most smartphones. No expensive LiDAR sensors are required." 
                            />
                        </FadeUp>
                        <FadeUp delay={200}>
                            <FAQItem 
                                question="Do I need a VR Headset for the 360° Walkthroughs?" 
                                answer="No. The 360° Walkthroughs utilize 'Magic Window VR', which uses your phone's built-in gyroscope. You simply move your phone to look around the room." 
                            />
                        </FadeUp>
                        <FadeUp delay={300}>
                            <FAQItem 
                                question="Will the app drain my battery quickly?" 
                                answer="We use background-optimized GPS geofencing that only polls your location actively when you are engaged in a quest, preserving your battery life." 
                            />
                        </FadeUp>
                        <FadeUp delay={400}>
                            <FAQItem 
                                question="Is this available for visitors or only students?" 
                                answer="ARQuest features role-based access. Students enjoy gamified quests and leaderboards, while Visitors and Professional Accreditors get streamlined access to mapping and facility tours." 
                            />
                        </FadeUp>
                    </div>
                </div>
            </section>

            {/* Final Push CTA Block */}
            <section className="py-24 bg-[#8A1538] relative overflow-hidden">
                {/* Abstract background graphics */}
                <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-1/3 w-96 h-96 bg-black opacity-20 rounded-full blur-3xl"></div>
                
                <div className="max-w-4xl mx-auto px-8 relative z-10 text-center space-y-8">
                    <FadeUp>
                        <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
                            Ready to explore the digital campus?
                        </h2>
                    </FadeUp>
                    <FadeUp delay={100}>
                        <p className="text-lg text-white/80 font-medium max-w-2xl mx-auto">
                            The ultimate spatial mapping and quest system for Western Mindanao State University is waiting.
                        </p>
                    </FadeUp>
                    <FadeUp delay={200}>
                        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
                            <button className="px-8 py-4 bg-white text-[#8A1538] rounded-md font-bold hover:bg-gray-50 transition-colors shadow-lg flex items-center gap-2">
                                <Smartphone size={20} />
                                Download the App
                            </button>
                        </div>
                    </FadeUp>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white py-12 border-t border-gray-200">
                <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-3">
                        <img src={logoUrl} alt={`${appName} Logo`} className="w-8 h-8 object-contain grayscale opacity-80" />
                        <span className="font-extrabold text-lg text-gray-900 tracking-tight">{appName}</span>
                    </div>
                    <div className="text-gray-500 text-sm font-medium">
                        © {new Date().getFullYear()} {appName} System. WMSU.
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
