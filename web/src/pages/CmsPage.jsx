import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
    Building2,
    Target,
    Lightbulb,
    HelpCircle,
    Plus,
    Edit3,
    Trash2,
    X,
    Search,
    ArrowLeft,
    CheckCircle2,
    Clock,
    Award,
    ChevronRight,
    Compass,
    Layers,
    Box,
    Calendar,
    Flame,
    BookOpen,
} from "lucide-react";
import { buildingService } from "../services/buildingService";
import { questService } from "../services/questService";
import { triviaService } from "../services/triviaService";
import { quizService } from "../services/quizService";
import { settingsService } from "../services/settingsService";
import { Button, Badge, ConfirmDeleteModal } from "../components/ui";
import {
    validateForm,
    validateString,
    validateNumber,
} from "../utils/validation";
import { theme } from "../theme";

export default function CmsPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const targetBuildingId = searchParams.get("buildingId");

    const [isLoading, setIsLoading] = useState(true);
    const [buildings, setBuildings] = useState([]);
    const [quests, setQuests] = useState([]);
    const [trivias, setTrivias] = useState([]);
    const [quizzes, setQuizzes] = useState([]);
    const [selectedBuilding, setSelectedBuilding] = useState(null);
    const [systemSettings, setSystemSettings] = useState(null);

    const [activeTab, setActiveTab] = useState("quests"); // 'quests' | 'trivias' | 'quizzes'

    // Modal & Form states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formTitle, setFormTitle] = useState("");
    const [formHint, setFormHint] = useState("");
    const [formReward, setFormReward] = useState(50);
    const [formDifficulty, setFormDifficulty] = useState("EASY");
    const [formFact, setFormFact] = useState("");
    const [formExpiresAt, setFormExpiresAt] = useState("");

    // Quiz states
    const [formQuestion, setFormQuestion] = useState("");
    const [formOptionA, setFormOptionA] = useState("");
    const [formOptionB, setFormOptionB] = useState("");
    const [formOptionC, setFormOptionC] = useState("");
    const [formOptionD, setFormOptionD] = useState("");
    const [formCorrectOption, setFormCorrectOption] = useState("A");

    const [errors, setErrors] = useState({});
    const [searchTerm, setSearchTerm] = useState("");

    // Delete confirmation state
    const [deleteModal, setDeleteModal] = useState({
        isOpen: false,
        type: null, // 'quest' | 'trivia' | 'quiz'
        id: null,
        title: "",
    });

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (!editingItem && systemSettings) {
            setFormReward(systemSettings.default_quest_reward || 50);
        }
    }, [systemSettings, editingItem]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [bData, qData, tData, quizData, sData] = await Promise.all([
                buildingService.getBuildings(),
                questService.getQuests(),
                triviaService.getTrivias(),
                quizService.getQuizzes(),
                settingsService.getSettings(),
            ]);
            setBuildings(bData || []);
            setQuests(qData || []);
            setTrivias(tData || []);
            setQuizzes(quizData || []);
            setSystemSettings(sData);

            if (targetBuildingId && bData && bData.length > 0) {
                const matched = bData.find((b) => String(b.id) === String(targetBuildingId));
                if (matched) {
                    setSelectedBuilding(matched);
                }
            }
        } catch (error) {
            console.error("Failed to load CMS data", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectBuilding = (b) => {
        setSelectedBuilding(b);
        setSearchParams({ buildingId: b.id });
        resetForm();
    };

    const handleBackToDirectory = () => {
        setSelectedBuilding(null);
        setSearchParams({});
        resetForm();
    };

    const handleBackToBuildingEditor = () => {
        if (targetBuildingId) {
            navigate(`/buildings/${targetBuildingId}`);
        } else {
            handleBackToDirectory();
        }
    };

    const handleBuildingSwitch = (e) => {
        const newId = e.target.value;
        const matched = buildings.find((b) => String(b.id) === String(newId));
        if (matched) {
            setSelectedBuilding(matched);
            setSearchParams({ buildingId: matched.id });
            resetForm();
        }
    };

    const resetForm = () => {
        setIsModalOpen(false);
        setEditingItem(null);
        setFormTitle("");
        setFormHint("");
        setFormFact("");
        setFormDifficulty("EASY");
        setFormExpiresAt("");
        setFormQuestion("");
        setFormOptionA("");
        setFormOptionB("");
        setFormOptionC("");
        setFormOptionD("");
        setFormCorrectOption("A");
        setFormReward(systemSettings?.default_quest_reward || 50);
        setErrors({});
    };

    // ---------------- Save Handlers ----------------

    const handleSaveQuest = async () => {
        const schema = {
            title: (val) => validateString(val, 1),
            hint: (val) => validateString(val, 1),
            reward_points: (val) => validateNumber(val, 0),
        };
        const formData = {
            title: formTitle,
            hint: formHint,
            reward_points: formReward,
        };
        const validationErrors = validateForm(formData, schema);
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) return;

        try {
            const payload = {
                title: formTitle,
                hint: formHint,
                target_building: selectedBuilding.id,
                reward_points: formReward === "" ? 0 : Number(formReward),
                difficulty: formDifficulty,
                expires_at: formExpiresAt || null,
                is_active: true,
            };
            if (editingItem) {
                const updated = await questService.updateQuest(editingItem.id, payload);
                setQuests(quests.map((q) => (q.id === updated.id ? updated : q)));
            } else {
                const created = await questService.createQuest(payload);
                setQuests([created, ...quests]);
            }
            resetForm();
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveTrivia = async () => {
        const schema = { fact: (val) => validateString(val, 1) };
        const validationErrors = validateForm({ fact: formFact }, schema);
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) return;

        try {
            const payload = {
                building: selectedBuilding.id,
                fact: formFact,
                is_active: true,
            };
            if (editingItem) {
                const updated = await triviaService.updateTrivia(editingItem.id, payload);
                setTrivias(trivias.map((t) => (t.id === updated.id ? updated : t)));
            } else {
                const created = await triviaService.createTrivia(payload);
                setTrivias([created, ...trivias]);
            }
            resetForm();
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveQuiz = async () => {
        const schema = {
            question: (val) => validateString(val, 1),
            option_a: (val) => validateString(val, 1),
            option_b: (val) => validateString(val, 1),
            option_c: (val) => validateString(val, 1),
            option_d: (val) => validateString(val, 1),
            exp_reward: (val) => validateNumber(val, 0),
        };
        const formData = {
            question: formQuestion,
            option_a: formOptionA,
            option_b: formOptionB,
            option_c: formOptionC,
            option_d: formOptionD,
            exp_reward: formReward,
        };
        const validationErrors = validateForm(formData, schema);
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) return;

        try {
            const payload = {
                building: selectedBuilding.id,
                question: formQuestion,
                option_a: formOptionA,
                option_b: formOptionB,
                option_c: formOptionC,
                option_d: formOptionD,
                correct_option: formCorrectOption,
                exp_reward: formReward === "" ? 0 : Number(formReward),
            };
            if (editingItem) {
                const updated = await quizService.updateQuiz(editingItem.id, payload);
                setQuizzes(quizzes.map((q) => (q.id === updated.id ? updated : q)));
            } else {
                const created = await quizService.createQuiz(payload);
                setQuizzes([created, ...quizzes]);
            }
            resetForm();
        } catch (err) {
            console.error(err);
        }
    };

    // ---------------- Delete Handlers ----------------

    const handleConfirmDelete = async () => {
        const { type, id } = deleteModal;
        if (!type || !id) return;

        try {
            if (type === "quest") {
                await questService.deleteQuest(id);
                setQuests(quests.filter((q) => q.id !== id));
            } else if (type === "trivia") {
                await triviaService.deleteTrivia(id);
                setTrivias(trivias.filter((t) => t.id !== id));
            } else if (type === "quiz") {
                await quizService.deleteQuiz(id);
                setQuizzes(quizzes.filter((q) => q.id !== id));
            }
            setDeleteModal({ isOpen: false, type: null, id: null, title: "" });
        } catch (err) {
            console.error(`Failed to delete ${type}`, err);
        }
    };

    // ---------------- Filtered building data for active landmark ----------------

    const buildingQuests = selectedBuilding
        ? quests.filter(
              (q) =>
                  q.target_building === selectedBuilding.id ||
                  q.target_building_name === selectedBuilding.name,
          )
        : [];

    const buildingTrivias = selectedBuilding
        ? trivias.filter(
              (t) =>
                  t.building === selectedBuilding.id ||
                  t.building_name === selectedBuilding.name,
          )
        : [];

    const buildingQuizzes = selectedBuilding
        ? quizzes.filter((q) => q.building === selectedBuilding.id)
        : [];

    const filteredBuildings = buildings.filter((b) =>
        b.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    // ---------------- 1. Full Page Loading State ----------------
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
                <div
                    className="w-10 h-10 rounded-full border-3 border-gray-200 border-t-brand animate-spin mb-3"
                    style={{ borderTopColor: theme.colors.primary }}
                />
                <h3 className="text-sm font-bold text-gray-800">
                    {targetBuildingId
                        ? "Opening Building Activities..."
                        : "Loading Campus Game Content..."}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                    Fetching quests, trivia facts, and quizzes...
                </p>
            </div>
        );
    }

    // ---------------- 2. In-Place Landmark Studio View ----------------
    if (selectedBuilding) {
        return (
            <div className="space-y-6 pb-20">
                {/* Institutional Header Bar */}
                <div
                    style={{
                        backgroundColor: "rgba(138,21,56,0.04)",
                        border: "1px solid rgba(138,21,56,0.12)",
                        borderRadius: "6px",
                    }}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                    <div className="flex items-center gap-3.5">
                        <button
                            type="button"
                            onClick={handleBackToBuildingEditor}
                            style={{
                                backgroundColor: theme.colors.primary,
                                borderRadius: "6px",
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-white text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shrink-0 shadow-xs"
                            title="Back"
                        >
                            <ArrowLeft size={14} />
                            <span>Back</span>
                        </button>

                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight truncate">
                                    {selectedBuilding.name}
                                </h1>
                                {selectedBuilding.primary_department && (
                                    <span
                                        className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-[6px] text-white shrink-0 shadow-2xs"
                                        style={{
                                            backgroundColor:
                                                selectedBuilding.primary_department
                                                    .color_hex ||
                                                theme.colors.primary,
                                        }}
                                    >
                                        {selectedBuilding.primary_department.name}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                                <span>Activities & Quizzes</span>
                                <span>•</span>
                                <span className="font-semibold text-gray-700">
                                    {buildingQuests.length} Quest
                                    {buildingQuests.length !== 1 ? "s" : ""}
                                </span>
                                <span>•</span>
                                <span className="font-semibold text-gray-700">
                                    {buildingTrivias.length} Trivia
                                    {buildingTrivias.length !== 1 ? "s" : ""}
                                </span>
                                <span>•</span>
                                <span className="font-semibold text-gray-700">
                                    {buildingQuizzes.length} Quiz
                                    {buildingQuizzes.length !== 1 ? "zes" : ""}
                                </span>
                            </p>
                        </div>
                    </div>

                    {/* Quick Buildings Switcher */}
                    <div className="flex items-center gap-2 shrink-0">
                        <label
                            htmlFor="landmark-switcher"
                            className="text-xs font-semibold text-gray-600 hidden sm:inline"
                        >
                            Switch Buildings:
                        </label>
                        <select
                            id="landmark-switcher"
                            value={selectedBuilding.id}
                            onChange={handleBuildingSwitch}
                            className="text-xs font-medium bg-white border border-gray-300 rounded-[6px] px-3 py-1.5 text-gray-800 outline-none focus:border-brand shadow-2xs cursor-pointer max-w-[200px] truncate"
                        >
                            {buildings.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Main Split-Screen Workspace */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                    {/* LEFT PANEL: 2D Landmark Showcase & Info (~4 cols) */}
                    <div className="lg:col-span-5 xl:col-span-4 bg-white border border-gray-200 rounded-[6px] p-5 shadow-xs flex flex-col justify-between h-full space-y-4">
                        <div className="space-y-4">
                            {/* Section Header (No red dot) */}
                            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                                    Landmark Showcase
                                </span>
                                <span className="text-[10px] font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-[6px] uppercase">
                                    2D Preview
                                </span>
                            </div>

                            {/* 2D Snapshot Image Card */}
                            <div className="relative rounded-[6px] overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center aspect-square w-full max-w-[260px] sm:max-w-[280px] mx-auto shadow-2xs group">
                                {selectedBuilding.image_url ? (
                                    <img
                                        src={selectedBuilding.image_url}
                                        alt={selectedBuilding.name}
                                        className="w-full h-full object-contain p-2.5 transition-transform duration-200 group-hover:scale-102"
                                    />
                                ) : (
                                    <div className="text-center p-4">
                                        <div className="w-12 h-12 rounded-[6px] bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto mb-2 text-brand">
                                            <Building2 size={24} />
                                        </div>
                                        <p className="text-xs font-bold text-gray-700">
                                            No 2D snapshot captured
                                        </p>
                                        <p className="text-[11px] text-gray-400 mt-0.5 max-w-[180px] leading-relaxed">
                                            Generate a 2D thumbnail in the Facility
                                            Editor.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Landmark Meta Info */}
                            <div className="space-y-2.5 bg-gray-50/70 rounded-[6px] p-3.5 border border-gray-150 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500 font-medium flex items-center gap-1.5">
                                        <Compass size={13} className="text-gray-400" />
                                        Coordinates
                                    </span>
                                    <span className="font-mono text-gray-700 font-semibold">
                                        {selectedBuilding.latitude && selectedBuilding.longitude
                                            ? `${Number(selectedBuilding.latitude).toFixed(5)}, ${Number(selectedBuilding.longitude).toFixed(5)}`
                                            : "Unassigned"}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500 font-medium flex items-center gap-1.5">
                                        <Layers size={13} className="text-gray-400" />
                                        Status
                                    </span>
                                    <Badge
                                        variant={
                                            selectedBuilding.status === "VISIBLE"
                                                ? "success"
                                                : selectedBuilding.status === "MAINTENANCE"
                                                  ? "warning"
                                                  : "gray"
                                        }
                                        className="text-[10px] py-0 px-2 rounded-[6px]"
                                    >
                                        {selectedBuilding.status || "DRAFT"}
                                    </Badge>
                                </div>

                                {selectedBuilding.model_version && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500 font-medium flex items-center gap-1.5">
                                            <Box size={13} className="text-gray-400" />
                                            3D Model Version
                                        </span>
                                        <span className="text-gray-700 font-semibold text-[11px]">
                                            v{selectedBuilding.model_version}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-3 gap-2.5 pt-1">
                            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-[6px] p-3 text-center">
                                <div className="flex items-center justify-center text-emerald-600 mb-1">
                                    <Target size={16} />
                                </div>
                                <div className="text-lg font-extrabold text-emerald-800 leading-none">
                                    {buildingQuests.length}
                                </div>
                                <div className="text-[10px] font-bold text-emerald-700/80 uppercase tracking-wider mt-1">
                                    Quests
                                </div>
                            </div>

                            <div className="bg-amber-50/70 border border-amber-200/80 rounded-[6px] p-3 text-center">
                                <div className="flex items-center justify-center text-amber-600 mb-1">
                                    <Lightbulb size={16} />
                                </div>
                                <div className="text-lg font-extrabold text-amber-800 leading-none">
                                    {buildingTrivias.length}
                                </div>
                                <div className="text-[10px] font-bold text-amber-700/80 uppercase tracking-wider mt-1">
                                    Trivia
                                </div>
                            </div>

                            <div className="bg-blue-50/70 border border-blue-200/80 rounded-[6px] p-3 text-center">
                                <div className="flex items-center justify-center text-blue-600 mb-1">
                                    <HelpCircle size={16} />
                                </div>
                                <div className="text-lg font-extrabold text-blue-800 leading-none">
                                    {buildingQuizzes.length}
                                </div>
                                <div className="text-[10px] font-bold text-blue-700/80 uppercase tracking-wider mt-1">
                                    Quizzes
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT PANEL: Activities & Quizzes Workshop (~7-8 cols) */}
                    <div className="lg:col-span-7 xl:col-span-8 bg-white border border-gray-200 rounded-[6px] shadow-xs overflow-hidden flex flex-col h-full min-h-[580px]">
                        {/* Workshop Top Header (No red dot, simple wording) */}
                        <div className="px-5 py-3.5 border-b border-gray-200 bg-gray-50/60 flex items-center justify-between shrink-0">
                            <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                                Activities & Quizzes
                            </span>

                            <button
                                type="button"
                                onClick={() => {
                                    resetForm();
                                    setIsModalOpen(true);
                                }}
                                style={{
                                    backgroundColor: theme.colors.primary,
                                    borderRadius: "6px",
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                            >
                                <Plus size={14} />
                                <span>
                                    Add{" "}
                                    {activeTab === "quests"
                                        ? "Quest"
                                        : activeTab === "trivias"
                                          ? "Trivia"
                                          : "Quiz"}
                                </span>
                            </button>
                        </div>

                        {/* Interactive Tab Navigation */}
                        <div className="flex border-b border-gray-200 bg-white shrink-0">
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveTab("quests");
                                }}
                                style={{
                                    borderBottomColor:
                                        activeTab === "quests"
                                            ? theme.colors.primary
                                            : "transparent",
                                    color:
                                        activeTab === "quests"
                                            ? theme.colors.primary
                                            : "#6b7280",
                                }}
                                className={`flex-1 py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                                    activeTab === "quests"
                                        ? "bg-brand/5"
                                        : "hover:bg-gray-50 hover:text-gray-800"
                                }`}
                            >
                                <Target size={15} />
                                <span>Quests & Missions</span>
                                <span
                                    className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-[6px] ${
                                        activeTab === "quests"
                                            ? "bg-brand text-white"
                                            : "bg-gray-100 text-gray-600"
                                    }`}
                                >
                                    {buildingQuests.length}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setActiveTab("trivias");
                                }}
                                style={{
                                    borderBottomColor:
                                        activeTab === "trivias"
                                            ? theme.colors.primary
                                            : "transparent",
                                    color:
                                        activeTab === "trivias"
                                            ? theme.colors.primary
                                            : "#6b7280",
                                }}
                                className={`flex-1 py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                                    activeTab === "trivias"
                                        ? "bg-brand/5"
                                        : "hover:bg-gray-50 hover:text-gray-800"
                                }`}
                            >
                                <Lightbulb size={15} />
                                <span>Trivia Facts</span>
                                <span
                                    className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-[6px] ${
                                        activeTab === "trivias"
                                            ? "bg-brand text-white"
                                            : "bg-gray-100 text-gray-600"
                                    }`}
                                >
                                    {buildingTrivias.length}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setActiveTab("quizzes");
                                }}
                                style={{
                                    borderBottomColor:
                                        activeTab === "quizzes"
                                            ? theme.colors.primary
                                            : "transparent",
                                    color:
                                        activeTab === "quizzes"
                                            ? theme.colors.primary
                                            : "#6b7280",
                                }}
                                className={`flex-1 py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                                    activeTab === "quizzes"
                                        ? "bg-brand/5"
                                        : "hover:bg-gray-50 hover:text-gray-800"
                                }`}
                            >
                                <HelpCircle size={15} />
                                <span>Quizzes</span>
                                <span
                                    className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-[6px] ${
                                        activeTab === "quizzes"
                                            ? "bg-brand text-white"
                                            : "bg-gray-100 text-gray-600"
                                    }`}
                                >
                                    {buildingQuizzes.length}
                                </span>
                            </button>
                        </div>

                        {/* Workshop Body - Option A (2-Column Tiles with Capped Scroll) */}
                        <div className="p-5 flex-1 flex flex-col min-h-0">
                            <div className="flex-1 overflow-y-auto max-h-[520px] pr-1">
                                {/* 1. Quests Tab */}
                                {activeTab === "quests" && (
                                    <>
                                        {buildingQuests.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {buildingQuests.map((quest) => {
                                                    const isExpired =
                                                        quest.expires_at &&
                                                        new Date(quest.expires_at) <
                                                            new Date();
                                                    return (
                                                        <div
                                                            key={quest.id}
                                                            style={{
                                                                borderLeftColor:
                                                                    isExpired
                                                                        ? "#9ca3af"
                                                                        : theme.colors.primary,
                                                            }}
                                                            className={`bg-white p-3.5 rounded-[6px] border-l-4 border-y border-r border-gray-200 shadow-2xs hover:shadow-xs hover:border-gray-300 transition-all flex flex-col justify-between group ${
                                                                isExpired
                                                                    ? "opacity-75 bg-gray-50/50"
                                                                    : ""
                                                            }`}
                                                        >
                                                            {/* Top row: Badges + Actions */}
                                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-brand/10 text-brand rounded-[6px] uppercase tracking-wide">
                                                                        +{quest.reward_points} EXP
                                                                    </span>
                                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded-[6px] uppercase tracking-wide">
                                                                        {quest.difficulty || "EASY"}
                                                                    </span>
                                                                    {isExpired && (
                                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-[6px] uppercase tracking-wide">
                                                                            Expired
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setEditingItem(quest);
                                                                            setFormTitle(quest.title);
                                                                            setFormHint(quest.hint);
                                                                            setFormReward(quest.reward_points);
                                                                            setFormDifficulty(
                                                                                quest.difficulty
                                                                                    ? quest.difficulty.toUpperCase()
                                                                                    : "EASY",
                                                                            );
                                                                            setFormExpiresAt(
                                                                                quest.expires_at
                                                                                    ? quest.expires_at.slice(
                                                                                          0,
                                                                                          16,
                                                                                      )
                                                                                    : "",
                                                                            );
                                                                            setIsModalOpen(true);
                                                                        }}
                                                                        className="p-1 text-gray-500 hover:text-brand bg-gray-50 hover:bg-brand/10 rounded-[6px] transition-colors cursor-pointer"
                                                                        title="Edit Quest"
                                                                    >
                                                                        <Edit3 size={13} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setDeleteModal({
                                                                                isOpen: true,
                                                                                type: "quest",
                                                                                id: quest.id,
                                                                                title: quest.title,
                                                                            })
                                                                        }
                                                                        className="p-1 text-gray-500 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-[6px] transition-colors cursor-pointer"
                                                                        title="Delete Quest"
                                                                    >
                                                                        <Trash2 size={13} />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Middle: Title & Hint preview */}
                                                            <div className="min-w-0 mb-2">
                                                                <h4
                                                                    className={`text-xs font-bold leading-snug line-clamp-2 ${
                                                                        isExpired
                                                                            ? "text-gray-500 line-through"
                                                                            : "text-gray-900"
                                                                    }`}
                                                                >
                                                                    {quest.title}
                                                                </h4>
                                                                <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2 mt-1">
                                                                    {quest.hint}
                                                                </p>
                                                            </div>

                                                            {/* Bottom: Expiry Date */}
                                                            {quest.expires_at && (
                                                                <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium pt-1.5 border-t border-gray-100 mt-auto">
                                                                    <Clock size={11} />
                                                                    <span className="truncate">
                                                                        Expires:{" "}
                                                                        {new Date(
                                                                            quest.expires_at,
                                                                        ).toLocaleDateString()}{" "}
                                                                        {new Date(
                                                                            quest.expires_at,
                                                                        ).toLocaleTimeString([], {
                                                                            hour: "2-digit",
                                                                            minute: "2-digit",
                                                                        })}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-center py-12 px-4 bg-gray-50/70 border border-dashed border-gray-300 rounded-[6px] flex-1 flex flex-col items-center justify-center min-h-[300px]">
                                                <Target
                                                    size={32}
                                                    className="mx-auto text-gray-400 mb-2"
                                                />
                                                <p className="text-xs font-bold text-gray-700">
                                                    No quests assigned to this landmark yet
                                                </p>
                                                <p className="text-[11px] text-gray-500 mt-0.5 max-w-sm mx-auto">
                                                    Create a scavenger hunt to challenge students arriving at this building.
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        resetForm();
                                                        setIsModalOpen(true);
                                                    }}
                                                    style={{
                                                        backgroundColor:
                                                            theme.colors.primary,
                                                        borderRadius: "6px",
                                                    }}
                                                    className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-white text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                                                >
                                                    <Plus size={14} />
                                                    <span>Create First Quest</span>
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* 2. Trivia Tab */}
                                {activeTab === "trivias" && (
                                    <>
                                        {buildingTrivias.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {buildingTrivias.map((trivia) => (
                                                    <div
                                                        key={trivia.id}
                                                        style={{
                                                            borderLeftColor:
                                                                theme.colors.primary,
                                                        }}
                                                        className="bg-white p-3.5 rounded-[6px] border-l-4 border-y border-r border-gray-200 shadow-2xs hover:shadow-xs hover:border-gray-300 transition-all flex flex-col justify-between group"
                                                    >
                                                        {/* Top row: Pill + Actions */}
                                                        <div className="flex items-center justify-between gap-2 mb-2">
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-amber-50 text-amber-800 rounded-[6px] uppercase tracking-wider">
                                                                <Lightbulb
                                                                    size={11}
                                                                    className="text-amber-600"
                                                                />
                                                                Trivia Fact
                                                            </span>

                                                            <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setEditingItem(trivia);
                                                                        setFormFact(trivia.fact);
                                                                        setIsModalOpen(true);
                                                                    }}
                                                                    className="p-1 text-gray-500 hover:text-brand bg-gray-50 hover:bg-brand/10 rounded-[6px] transition-colors cursor-pointer"
                                                                    title="Edit Trivia"
                                                                >
                                                                    <Edit3 size={13} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setDeleteModal({
                                                                            isOpen: true,
                                                                            type: "trivia",
                                                                            id: trivia.id,
                                                                            title: trivia.fact,
                                                                        })
                                                                    }
                                                                    className="p-1 text-gray-500 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-[6px] transition-colors cursor-pointer"
                                                                    title="Delete Trivia"
                                                                >
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Middle: Fact content */}
                                                        <div className="min-w-0">
                                                            <p className="text-xs text-gray-800 leading-relaxed line-clamp-4">
                                                                {trivia.fact}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-12 px-4 bg-gray-50/70 border border-dashed border-gray-300 rounded-[6px] flex-1 flex flex-col items-center justify-center min-h-[300px]">
                                                <Lightbulb
                                                    size={32}
                                                    className="mx-auto text-gray-400 mb-2"
                                                />
                                                <p className="text-xs font-bold text-gray-700">
                                                    No trivia facts recorded for this landmark
                                                </p>
                                                <p className="text-[11px] text-gray-500 mt-0.5 max-w-sm mx-auto">
                                                    Share historical facts, architectural milestones, or campus traditions.
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        resetForm();
                                                        setIsModalOpen(true);
                                                    }}
                                                    style={{
                                                        backgroundColor:
                                                            theme.colors.primary,
                                                        borderRadius: "6px",
                                                    }}
                                                    className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-white text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                                                >
                                                    <Plus size={14} />
                                                    <span>Create First Trivia Fact</span>
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* 3. Quizzes Tab */}
                                {activeTab === "quizzes" && (
                                    <>
                                        {buildingQuizzes.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {buildingQuizzes.map((quiz) => {
                                                    const correctText =
                                                        quiz.correct_option === "A"
                                                            ? quiz.option_a
                                                            : quiz.correct_option === "B"
                                                              ? quiz.option_b
                                                              : quiz.correct_option === "C"
                                                                ? quiz.option_c
                                                                : quiz.option_d;

                                                    return (
                                                        <div
                                                            key={quiz.id}
                                                            style={{
                                                                borderLeftColor:
                                                                    theme.colors.primary,
                                                            }}
                                                            className="bg-white p-3.5 rounded-[6px] border-l-4 border-y border-r border-gray-200 shadow-2xs hover:shadow-xs hover:border-gray-300 transition-all flex flex-col justify-between group space-y-2"
                                                        >
                                                            {/* Top row: EXP Badge + Actions */}
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-[6px] uppercase tracking-wide">
                                                                    +{quiz.exp_reward} EXP
                                                                </span>

                                                                <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setEditingItem(quiz);
                                                                            setFormQuestion(quiz.question);
                                                                            setFormOptionA(quiz.option_a);
                                                                            setFormOptionB(quiz.option_b);
                                                                            setFormOptionC(quiz.option_c);
                                                                            setFormOptionD(quiz.option_d);
                                                                            setFormCorrectOption(
                                                                                quiz.correct_option,
                                                                            );
                                                                            setFormReward(quiz.exp_reward);
                                                                            setIsModalOpen(true);
                                                                        }}
                                                                        className="p-1 text-gray-500 hover:text-brand bg-gray-50 hover:bg-brand/10 rounded-[6px] transition-colors cursor-pointer"
                                                                        title="Edit Quiz"
                                                                    >
                                                                        <Edit3 size={13} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setDeleteModal({
                                                                                isOpen: true,
                                                                                type: "quiz",
                                                                                id: quiz.id,
                                                                                title: quiz.question,
                                                                            })
                                                                        }
                                                                        className="p-1 text-gray-500 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-[6px] transition-colors cursor-pointer"
                                                                        title="Delete Quiz"
                                                                    >
                                                                        <Trash2 size={13} />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Middle: Question */}
                                                            <div className="min-w-0">
                                                                <h4 className="text-xs font-bold text-gray-900 leading-snug line-clamp-2">
                                                                    {quiz.question}
                                                                </h4>
                                                            </div>

                                                            {/* Bottom: Answer Pills Summary */}
                                                            <div className="pt-2 border-t border-gray-100 space-y-1 text-[11px]">
                                                                <div className="flex items-center justify-between px-2 py-1 rounded-[6px] bg-emerald-50 border border-emerald-200 text-emerald-900 font-semibold truncate">
                                                                    <span className="truncate">
                                                                        ✓ {quiz.correct_option}: {correctText}
                                                                    </span>
                                                                    <span className="text-[9px] uppercase font-extrabold text-emerald-700 bg-emerald-100 px-1 rounded-[4px] shrink-0 ml-1">
                                                                        Correct
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 text-[10px] text-gray-400 px-0.5">
                                                                    <span>4 options configured</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-center py-12 px-4 bg-gray-50/70 border border-dashed border-gray-300 rounded-[6px] flex-1 flex flex-col items-center justify-center min-h-[300px]">
                                                <HelpCircle
                                                    size={32}
                                                    className="mx-auto text-gray-400 mb-2"
                                                />
                                                <p className="text-xs font-bold text-gray-700">
                                                    No quizzes configured for this landmark
                                                </p>
                                                <p className="text-[11px] text-gray-500 mt-0.5 max-w-sm mx-auto">
                                                    Test students on facts they discover during AR navigation.
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        resetForm();
                                                        setIsModalOpen(true);
                                                    }}
                                                    style={{
                                                        backgroundColor:
                                                            theme.colors.primary,
                                                        borderRadius: "6px",
                                                    }}
                                                    className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-white text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                                                >
                                                    <Plus size={14} />
                                                    <span>Create First Quiz</span>
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- CENTERED ADD / EDIT MODAL --- */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
                        <div className="bg-white rounded-[6px] border border-gray-200 shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
                            {/* Modal Header */}
                            <div className="px-5 py-4 border-b border-gray-200 bg-gray-50/70 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-2.5">
                                    <div
                                        className="w-7 h-7 rounded-[6px] flex items-center justify-center text-white"
                                        style={{ backgroundColor: theme.colors.primary }}
                                    >
                                        {editingItem ? <Edit3 size={14} /> : <Plus size={14} />}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900 leading-tight">
                                            {editingItem ? "Edit" : "New"}{" "}
                                            {activeTab === "quests"
                                                ? "Scavenger Quest"
                                                : activeTab === "trivias"
                                                  ? "Trivia Fact"
                                                  : "Interactive Quiz"}
                                        </h3>
                                        <p className="text-[11px] text-gray-500 mt-0.5">
                                            {selectedBuilding.name}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="p-1.5 text-gray-400 hover:text-gray-700 rounded-[6px] hover:bg-gray-100 transition-colors cursor-pointer"
                                    title="Close"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Modal Scrollable Body */}
                            <div className="p-5 overflow-y-auto flex-1 space-y-4">
                                {/* 1. Quest Form Fields */}
                                {activeTab === "quests" && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                                Quest Title *
                                            </label>
                                            <input
                                                type="text"
                                                value={formTitle}
                                                onChange={(e) => {
                                                    setFormTitle(e.target.value);
                                                    setErrors((prev) => ({
                                                        ...prev,
                                                        title: null,
                                                    }));
                                                }}
                                                placeholder="e.g., Locate the founding cornerstone"
                                                className={`w-full p-2.5 bg-white border ${
                                                    errors.title
                                                        ? "border-red-500"
                                                        : "border-gray-300"
                                                } rounded-[6px] text-xs font-medium text-gray-900 outline-none focus:border-brand shadow-2xs`}
                                            />
                                            {errors.title && (
                                                <p className="text-red-500 text-[11px] mt-1 font-semibold">
                                                    {errors.title}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                                Exploration Clue / Hint *
                                            </label>
                                            <textarea
                                                rows={3}
                                                value={formHint}
                                                onChange={(e) => {
                                                    setFormHint(e.target.value);
                                                    setErrors((prev) => ({
                                                        ...prev,
                                                        hint: null,
                                                    }));
                                                }}
                                                placeholder="Provide a helpful architectural clue guiding students to this zone..."
                                                className={`w-full p-2.5 bg-white border ${
                                                    errors.hint
                                                        ? "border-red-500"
                                                        : "border-gray-300"
                                                } rounded-[6px] text-xs font-medium text-gray-900 outline-none focus:border-brand shadow-2xs`}
                                            />
                                            {errors.hint && (
                                                <p className="text-red-500 text-[11px] mt-1 font-semibold">
                                                    {errors.hint}
                                                </p>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                                    Reward Points *
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={formReward}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setFormReward(
                                                            val === "" ? "" : Number(val),
                                                        );
                                                        setErrors((prev) => ({
                                                            ...prev,
                                                            reward_points: null,
                                                        }));
                                                    }}
                                                    className={`w-full p-2.5 bg-white border ${
                                                        errors.reward_points
                                                            ? "border-red-500"
                                                            : "border-gray-300"
                                                    } rounded-[6px] text-xs font-medium text-gray-900 outline-none focus:border-brand shadow-2xs`}
                                                />
                                                {errors.reward_points && (
                                                    <p className="text-red-500 text-[11px] mt-1 font-semibold">
                                                        {errors.reward_points}
                                                    </p>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                                    Difficulty
                                                </label>
                                                <select
                                                    value={formDifficulty}
                                                    onChange={(e) =>
                                                        setFormDifficulty(
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full p-2.5 bg-white border border-gray-300 rounded-[6px] text-xs font-medium text-gray-900 outline-none focus:border-brand shadow-2xs cursor-pointer"
                                                >
                                                    <option value="EASY">Easy</option>
                                                    <option value="MEDIUM">Medium</option>
                                                    <option value="HARD">Hard</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                                Expiration Date (Optional)
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={formExpiresAt}
                                                onChange={(e) =>
                                                    setFormExpiresAt(e.target.value)
                                                }
                                                className="w-full p-2.5 bg-white border border-gray-300 rounded-[6px] text-xs font-medium text-gray-900 outline-none focus:border-brand shadow-2xs"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* 2. Trivia Form Fields */}
                                {activeTab === "trivias" && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                                Campus Trivia Fact *
                                            </label>
                                            <textarea
                                                rows={5}
                                                value={formFact}
                                                onChange={(e) => {
                                                    setFormFact(e.target.value);
                                                    setErrors((prev) => ({
                                                        ...prev,
                                                        fact: null,
                                                    }));
                                                }}
                                                placeholder="Share an interesting historical fact, architectural detail, or tradition..."
                                                className={`w-full p-2.5 bg-white border ${
                                                    errors.fact
                                                        ? "border-red-500"
                                                        : "border-gray-300"
                                                } rounded-[6px] text-xs font-medium text-gray-900 outline-none focus:border-brand shadow-2xs`}
                                            />
                                            {errors.fact && (
                                                <p className="text-red-500 text-[11px] mt-1 font-semibold">
                                                    {errors.fact}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* 3. Quiz Form Fields */}
                                {activeTab === "quizzes" && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                                Question *
                                            </label>
                                            <input
                                                type="text"
                                                value={formQuestion}
                                                onChange={(e) => {
                                                    setFormQuestion(
                                                        e.target.value,
                                                    );
                                                    setErrors((prev) => ({
                                                        ...prev,
                                                        question: null,
                                                    }));
                                                }}
                                                placeholder="e.g., What year was this building established?"
                                                className={`w-full p-2.5 bg-white border ${
                                                    errors.question
                                                        ? "border-red-500"
                                                        : "border-gray-300"
                                                } rounded-[6px] text-xs font-medium text-gray-900 outline-none focus:border-brand shadow-2xs`}
                                            />
                                            {errors.question && (
                                                <p className="text-red-500 text-[11px] mt-1 font-semibold">
                                                    {errors.question}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                                    Option A *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formOptionA}
                                                    onChange={(e) => {
                                                        setFormOptionA(
                                                            e.target.value,
                                                        );
                                                        setErrors((prev) => ({
                                                            ...prev,
                                                            option_a: null,
                                                        }));
                                                    }}
                                                    className={`w-full p-2 bg-white border ${
                                                        errors.option_a
                                                            ? "border-red-500"
                                                            : "border-gray-300"
                                                    } rounded-[6px] text-xs text-gray-900 outline-none focus:border-brand shadow-2xs`}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                                    Option B *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formOptionB}
                                                    onChange={(e) => {
                                                        setFormOptionB(
                                                            e.target.value,
                                                        );
                                                        setErrors((prev) => ({
                                                            ...prev,
                                                            option_b: null,
                                                        }));
                                                    }}
                                                    className={`w-full p-2 bg-white border ${
                                                        errors.option_b
                                                            ? "border-red-500"
                                                            : "border-gray-300"
                                                    } rounded-[6px] text-xs text-gray-900 outline-none focus:border-brand shadow-2xs`}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                                    Option C *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formOptionC}
                                                    onChange={(e) => {
                                                        setFormOptionC(
                                                            e.target.value,
                                                        );
                                                        setErrors((prev) => ({
                                                            ...prev,
                                                            option_c: null,
                                                        }));
                                                    }}
                                                    className={`w-full p-2 bg-white border ${
                                                        errors.option_c
                                                            ? "border-red-500"
                                                            : "border-gray-300"
                                                    } rounded-[6px] text-xs text-gray-900 outline-none focus:border-brand shadow-2xs`}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                                    Option D *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formOptionD}
                                                    onChange={(e) => {
                                                        setFormOptionD(
                                                            e.target.value,
                                                        );
                                                        setErrors((prev) => ({
                                                            ...prev,
                                                            option_d: null,
                                                        }));
                                                    }}
                                                    className={`w-full p-2 bg-white border ${
                                                        errors.option_d
                                                            ? "border-red-500"
                                                            : "border-gray-300"
                                                    } rounded-[6px] text-xs text-gray-900 outline-none focus:border-brand shadow-2xs`}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                                    Correct Answer *
                                                </label>
                                                <select
                                                    value={formCorrectOption}
                                                    onChange={(e) =>
                                                        setFormCorrectOption(
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full p-2.5 bg-white border border-gray-300 rounded-[6px] text-xs font-medium text-gray-900 outline-none focus:border-brand shadow-2xs cursor-pointer"
                                                >
                                                    <option value="A">Option A</option>
                                                    <option value="B">Option B</option>
                                                    <option value="C">Option C</option>
                                                    <option value="D">Option D</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                                    Reward EXP *
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={formReward}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setFormReward(
                                                            val === "" ? "" : Number(val),
                                                        );
                                                        setErrors((prev) => ({
                                                            ...prev,
                                                            exp_reward: null,
                                                        }));
                                                    }}
                                                    className="w-full p-2.5 bg-white border border-gray-300 rounded-[6px] text-xs font-medium text-gray-900 outline-none focus:border-brand shadow-2xs"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="px-5 py-3.5 border-t border-gray-200 bg-gray-50/70 flex items-center justify-end gap-2.5 shrink-0">
                                <Button
                                    variant="secondary"
                                    onClick={resetForm}
                                    className="rounded-[6px] text-xs"
                                >
                                    Cancel
                                </Button>
                                <button
                                    type="button"
                                    onClick={
                                        activeTab === "quests"
                                            ? handleSaveQuest
                                            : activeTab === "trivias"
                                              ? handleSaveTrivia
                                              : handleSaveQuiz
                                    }
                                    style={{
                                        backgroundColor: theme.colors.primary,
                                        borderRadius: "6px",
                                    }}
                                    className="px-4 py-2 text-white text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                                >
                                    {editingItem
                                        ? `Update ${
                                              activeTab === "quests"
                                                  ? "Quest"
                                                  : activeTab === "trivias"
                                                    ? "Trivia"
                                                    : "Quiz"
                                          }`
                                        : `Save ${
                                              activeTab === "quests"
                                                  ? "Quest"
                                                  : activeTab === "trivias"
                                                    ? "Trivia"
                                                    : "Quiz"
                                          }`}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Shared Delete Confirmation Modal */}
                <ConfirmDeleteModal
                    isOpen={deleteModal.isOpen}
                    onClose={() =>
                        setDeleteModal({
                            isOpen: false,
                            type: null,
                            id: null,
                            title: "",
                        })
                    }
                    onConfirm={handleConfirmDelete}
                    title={`Delete ${
                        deleteModal.type === "quest"
                            ? "Quest"
                            : deleteModal.type === "trivia"
                              ? "Trivia Fact"
                              : "Quiz"
                    }`}
                    message={`Are you sure you want to permanently delete "${deleteModal.title}"? This action cannot be undone.`}
                    confirmText="Delete"
                />
            </div>
        );
    }

    // ---------------- 3. Landmark Directory View (When No Building Selected) ----------------
    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    Game Content Directory
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Select a campus facility or landmark to configure its exploration quests, trivia facts, and multiple-choice quizzes.
                </p>
            </div>

            {/* Search Input Bar */}
            <div className="bg-white p-3.5 rounded-[6px] border border-gray-200 shadow-2xs flex items-center gap-3">
                <Search size={18} className="text-gray-400 shrink-0" />
                <input
                    type="text"
                    placeholder="Search campus buildings by name..."
                    className="flex-1 bg-transparent outline-none text-xs sm:text-sm text-gray-900"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                    <button
                        type="button"
                        onClick={() => setSearchTerm("")}
                        className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* Landmark Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredBuildings.map((b) => {
                    const bQuests = quests.filter(
                        (q) =>
                            q.target_building === b.id ||
                            q.target_building_name === b.name,
                    );
                    const bTrivias = trivias.filter(
                        (t) =>
                            t.building === b.id || t.building_name === b.name,
                    );
                    const bQuizzes = quizzes.filter((q) => q.building === b.id);

                    return (
                        <div
                            key={b.id}
                            onClick={() => handleSelectBuilding(b)}
                            className="bg-white rounded-[6px] border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all hover:border-brand flex flex-col justify-between h-40 group"
                        >
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 shrink-0 rounded-[6px] bg-brand/10 group-hover:bg-brand text-brand group-hover:text-white flex items-center justify-center transition-colors">
                                    <Building2 size={20} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-bold text-gray-900 line-clamp-2 text-xs sm:text-sm group-hover:text-brand transition-colors">
                                        {b.name}
                                    </h3>
                                    {b.primary_department && (
                                        <p className="text-[11px] text-gray-500 truncate mt-0.5">
                                            {b.primary_department.name}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                                <div className="flex flex-wrap gap-1">
                                    <Badge
                                        variant={
                                            bQuests.length > 0 ? "success" : "gray"
                                        }
                                        className="text-[9px] py-0.5 px-1.5 rounded-[6px]"
                                    >
                                        {bQuests.length} Quest
                                        {bQuests.length !== 1 ? "s" : ""}
                                    </Badge>
                                    <Badge
                                        variant={
                                            bTrivias.length > 0
                                                ? "warning"
                                                : "gray"
                                        }
                                        className="text-[9px] py-0.5 px-1.5 rounded-[6px]"
                                    >
                                        {bTrivias.length} Trivia
                                    </Badge>
                                    <Badge
                                        variant={
                                            bQuizzes.length > 0 ? "blue" : "gray"
                                        }
                                        className="text-[9px] py-0.5 px-1.5 rounded-[6px]"
                                    >
                                        {bQuizzes.length} Quiz
                                        {bQuizzes.length !== 1 ? "zes" : ""}
                                    </Badge>
                                </div>
                                <ChevronRight
                                    size={16}
                                    className="text-gray-400 group-hover:text-brand group-hover:translate-x-0.5 transition-all"
                                />
                            </div>
                        </div>
                    );
                })}

                {filteredBuildings.length === 0 && (
                    <div className="col-span-full py-16 text-center bg-white border border-dashed border-gray-200 rounded-[6px]">
                        <Building2 size={36} className="mx-auto text-gray-300 mb-2" />
                        <h4 className="text-sm font-bold text-gray-700">
                            No landmarks matched your search
                        </h4>
                        <p className="text-xs text-gray-400 mt-1">
                            Try searching with a different campus building keyword.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
