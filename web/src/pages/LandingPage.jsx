import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Trophy, Eye, ChevronRight, Smartphone, Camera, Navigation, Layers, Monitor, Target } from 'lucide-react';
import Map, { Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const WMSU_CENTER = { lat: 6.9122, lng: 122.0605 };

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

const LandingPage = () => {
    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans overflow-x-hidden selection:bg-[#8A1538] selection:text-white">
            
            {/* Apple-Style Header (Ultra-thin, frosted glass, centered links) */}
            <nav className="fixed top-0 inset-x-0 z-50 bg-white/70 backdrop-blur-xl border-b border-gray-200/50">
                <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between text-xs font-semibold tracking-wide text-gray-800">
                    <Link to="/" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                        <img src="/logo.png" alt="ARQuest Logo" className="w-5 h-5 object-contain" />
                        <span className="font-bold">ARQuest</span>
                    </Link>
                    
                    <div className="hidden md:flex gap-8">
                        <a href="#map" className="hover:text-[#8A1538] transition-colors">Map</a>
                        <a href="#ecosystem" className="hover:text-[#8A1538] transition-colors">Ecosystem</a>
                        <a href="#features" className="hover:text-[#8A1538] transition-colors">Features</a>
                    </div>
                    
                    <Link to="/login" className="px-4 py-1.5 rounded-md bg-gray-900 text-white hover:bg-[#8A1538] transition-colors">
                        Login
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="max-w-7xl mx-auto px-8 pt-32 pb-24 flex flex-col md:flex-row items-center gap-12 relative">
                <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-bl from-red-50/80 to-transparent -z-10 rounded-bl-md"></div>

                <div className="flex-1 space-y-8 z-10">
                    <FadeUp delay={0}>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-50 border border-red-100 text-[#8A1538] text-xs font-bold tracking-widest uppercase">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-md bg-[#8A1538] opacity-75"></span>
                              <span className="relative inline-flex rounded-md h-2 w-2 bg-[#8A1538]"></span>
                            </span>
                            WMSU Smart Campus System
                        </div>
                    </FadeUp>
                    
                    <FadeUp delay={100}>
                        <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-tight text-gray-900">
                            Your Campus, <br />
                            <span className="text-[#8A1538]">Fully Unlocked.</span>
                        </h1>
                    </FadeUp>
                    
                    <FadeUp delay={200}>
                        <p className="text-xl text-gray-600 max-w-lg leading-relaxed font-medium">
                            Step into the digital layer of the university. ARQuest merges Mapbox GPS, 3D visualization, and competitive trivia into one seamless exploration app.
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
                                We are bridging the gap between physical heritage and digital innovation. 
                                ARQuest transforms the historic architecture and sprawling grounds of WMSU 
                                into a highly interactive, accessible, and connected spatial experience.
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

            {/* Big Map Section */}
            <section id="map" className="py-32 bg-gray-50 border-y border-gray-200/50 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-8 relative z-10 text-center mb-16">
                    <FadeUp>
                        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-6">The Digital Twin.</h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto font-medium leading-relaxed">
                            Navigate a stunning 3D replica of the WMSU campus. Experience real-time pathfinding, building highlights, and live geofence tracking powered by Mapbox.
                        </p>
                    </FadeUp>
                </div>
                
                <FadeUp delay={200}>
                    <div className="w-full">
                        <div className="h-[60vh] md:h-[80vh] w-full bg-[#E5E7EB] border-y border-gray-300 relative group">
                            <Map
                                mapboxAccessToken={MAPBOX_TOKEN}
                                initialViewState={{
                                    longitude: WMSU_CENTER.lng,
                                    latitude: WMSU_CENTER.lat,
                                    zoom: 16,
                                    pitch: 60,
                                    bearing: -20
                                }}
                                style={{ width: '100%', height: '100%' }}
                                mapStyle="mapbox://styles/mapbox/light-v11"
                                interactive={false}
                                reuseMaps
                            >
                                {/* Marker showing a sample unlocked building */}
                                <Marker longitude={WMSU_CENTER.lng} latitude={WMSU_CENTER.lat}>
                                    <div className="relative flex flex-col items-center">
                                        <div className="w-16 h-16 bg-[#8A1538]/20 rounded-full absolute -top-4 animate-ping"></div>
                                        <div className="bg-[#8A1538] text-white px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap shadow-xl flex items-center gap-1 z-10 border border-white">
                                            <MapPin size={14} /> WMSU Campus
                                        </div>
                                        <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-[#8A1538]"></div>
                                    </div>
                                </Marker>
                            </Map>
                            
                            {/* Map UI Overlay */}
                            <div className="absolute bottom-6 right-6 flex flex-col gap-2">
                                <div className="w-10 h-10 bg-white border border-gray-200 shadow-sm rounded-md flex items-center justify-center font-bold text-gray-600 hover:bg-gray-50 cursor-pointer">+</div>
                                <div className="w-10 h-10 bg-white border border-gray-200 shadow-sm rounded-md flex items-center justify-center font-bold text-gray-600 hover:bg-gray-50 cursor-pointer">-</div>
                            </div>
                            <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-sm border border-gray-200 px-4 py-2 rounded-md shadow-sm font-bold text-sm text-gray-800">
                                GPS Tracking: <span className="text-green-600">Active</span>
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
                                    Turn your smartphone into a magic lens. Designed for on-the-ground engagement, exploration, and augmented reality.
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
                                    A powerful command center for managing the digital campus from anywhere. No physical presence required.
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
                                            <p className="text-gray-600 leading-relaxed">Accreditors can navigate seamless indoor A-Frame panoramic tours without stepping foot on campus.</p>
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
                                    No manual check-ins. ARQuest uses a highly calibrated Mapbox GPS system. Cross the boundary of a campus building, and your app instantly unlocks exclusive 3D models and trivia facts.
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

            {/* Footer */}
            <footer className="bg-white py-12 border-t border-gray-200">
                <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="ARQuest Logo" className="w-8 h-8 object-contain grayscale opacity-80" />
                        <span className="font-extrabold text-lg text-gray-900 tracking-tight">ARQuest</span>
                    </div>
                    <div className="text-gray-500 text-sm font-medium">
                        © {new Date().getFullYear()} ARQuest System. WMSU.
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
