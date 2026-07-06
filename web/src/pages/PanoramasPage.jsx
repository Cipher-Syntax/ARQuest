import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Plus, Image as ImageIcon, Box } from "lucide-react";
import { Card } from "../components/ui";
import { buildingService } from "../services/buildingService";
import { panoramaService } from "../services/panoramaService";
import { theme } from "../theme";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const getFullUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${API_BASE_URL}${url}`;
};

const PanoramasPage = () => {
    const navigate = useNavigate();
    const [buildings, setBuildings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadBuildings();
    }, []);

    const loadBuildings = async () => {
        try {
            const data = await buildingService.getBuildings();
            const buildingsWithScenes = await Promise.all(
                data.map(async (b) => {
                    try {
                        const scenes = await panoramaService.getBuildingScenes(
                            b.id,
                        );
                        return { ...b, scenes: scenes || [] };
                    } catch (e) {
                        return { ...b, scenes: [] };
                    }
                }),
            );
            setBuildings(buildingsWithScenes);
        } catch (error) {
            console.error("Failed to load buildings:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div style={{ padding: "24px" }}>Loading buildings...</div>;
    }

    return (
        <div>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: theme.spacing.lg,
                }}
            >
                <div>
                    <h1
                        style={{
                            fontSize: "28px",
                            fontWeight: "bold",
                            margin: 0,
                        }}
                    >
                        Panorama Management
                    </h1>
                    <p
                        style={{
                            color: theme.colors.text.secondary,
                            marginTop: "8px",
                        }}
                    >
                        Manage 360° panorama scenes and hotspots for each
                        building
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {buildings.map((building) => {
                    const hasPanoramas =
                        building.scenes && building.scenes.length > 0;

                    return (
                        <Card
                            key={building.id}
                            className="group cursor-pointer hover:border-brand hover:shadow-xl transition-all duration-300"
                            onClick={() =>
                                navigate(`/panoramas/${building.id}`)
                            }
                        >
                            <div className="aspect-video bg-gray-100 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
                                {hasPanoramas ? (
                                    <div className="w-full h-full">
                                        <img
                                            src={getFullUrl(
                                                building.scenes[0].image_url,
                                            )}
                                            alt={building.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div className="text-gray-400 flex flex-col items-center">
                                        <ImageIcon
                                            size={32}
                                            className="mb-2 opacity-50"
                                        />
                                        <span className="text-xs font-bold uppercase tracking-wider">
                                            No Panoramas
                                        </span>
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center pointer-events-none">
                                    <div className="opacity-0 group-hover:opacity-100 bg-white/90 backdrop-blur-sm text-brand font-bold text-sm px-4 py-2 rounded-full transition-all transform translate-y-4 group-hover:translate-y-0 shadow-lg">
                                        Manage Panoramas
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 truncate">
                                    {building.name}
                                </h3>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                    {building.description || "No description"}
                                </p>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {buildings.length === 0 && (
                <div
                    style={{
                        textAlign: "center",
                        padding: "48px",
                        color: theme.colors.text.secondary,
                    }}
                >
                    <Camera
                        size={48}
                        style={{ margin: "0 auto 16px", opacity: 0.3 }}
                    />
                    <p>
                        No buildings found. Create buildings first before adding
                        panoramas.
                    </p>
                </div>
            )}
        </div>
    );
};

export default PanoramasPage;
