import { useState, useEffect, useMemo } from "react";
import {
    Building2,
    Users,
    Target,
    ListChecks,
    Layers,
    MessageSquare,
    Download,
    Printer,
    RefreshCw,
    AlertCircle,
    FileBarChart,
} from "lucide-react";
import { Card, Button, Badge, Toggle, Pagination, cn } from "../components/ui";
import { reportService } from "../services/reportService";
import { buildingService } from "../services/buildingService";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

const PAGE_SIZE = 10;

const REPORTS = [
    {
        id: "building-visits",
        label: "Building Visits",
        icon: Building2,
        dated: true,
        usesDemo: true,
    },
    {
        id: "student-engagement",
        label: "Student Engagement",
        icon: Users,
        dated: true,
        usesDemo: true,
        usesNames: true,
    },
    {
        id: "quest-performance",
        label: "Quest Performance",
        icon: Target,
        dated: true,
    },
    {
        id: "quiz-performance",
        label: "Quiz Performance",
        icon: ListChecks,
        dated: true,
    },
    {
        id: "content-readiness",
        label: "Content Readiness",
        icon: Layers,
        dated: false,
    },
    {
        id: "feedback",
        label: "Feedback and Issues",
        icon: MessageSquare,
        dated: true,
    },
];

const DATE_PRESETS = [
    { id: "7", label: "Last 7 days" },
    { id: "30", label: "Last 30 days" },
    { id: "90", label: "Last 90 days" },
    { id: "year", label: "This year" },
    { id: "custom", label: "Custom range" },
];

const SELECT_CLASS =
    "w-full px-3 py-2 bg-white border border-brand-border rounded-md text-sm font-medium text-gray-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand";

function toIsoDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function daysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
}

function presetRange(preset) {
    const today = new Date();
    if (preset === "year") {
        return {
            from: `${today.getFullYear()}-01-01`,
            to: toIsoDate(today),
        };
    }
    const days = Number(preset) || 30;
    return {
        from: toIsoDate(daysAgo(days - 1)),
        to: toIsoDate(today),
    };
}

function formatDate(value) {
    if (!value) return "Not set";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function readError(error, fallback) {
    const data = error?.response?.data;
    if (
        data &&
        typeof data === "object" &&
        !(data instanceof Blob) &&
        data.error?.message
    ) {
        return data.error.message;
    }
    return error?.message || fallback;
}

function displayValue(value) {
    if (value === null || value === undefined || value === "") return "-";
    if (typeof value === "number") return value.toLocaleString();
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) return date.toLocaleString();
    }
    return value;
}

const CHART_COLORS = ["#b21830", "#c9a227", "#64748b", "#d98b8f"];

function truncateLabel(value, max = 16) {
    const text = String(value ?? "");
    return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function slugify(value) {
    return String(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

function topRows(items, limit) {
    return [...items].sort((a, b) => b.value - a.value).slice(0, limit);
}

function totalOf(rows, key) {
    return rows.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);
}

function countBy(rows, key) {
    const counts = rows.reduce((acc, row) => {
        const name = row[key] || "Not set";
        acc[name] = (acc[name] || 0) + 1;
        return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

const CHART_CONFIG = {
    "building-visits": [
        {
            type: "bar",
            title: "Student unlocks by building",
            note: "Top 8",
            bars: [{ key: "value", label: "Unlocks" }],
            build: (rows) =>
                topRows(
                    rows.map((row) => ({
                        name: row.building,
                        value: row.total_unlocks || 0,
                    })),
                    8,
                ),
        },
        {
            type: "pie",
            title: "How students unlocked buildings",
            note: "By method",
            build: (rows) => [
                { name: "Geofence", value: totalOf(rows, "geofence_unlocks") },
                { name: "QR", value: totalOf(rows, "qr_unlocks") },
            ],
        },
    ],
    "student-engagement": [
        {
            type: "bar",
            title: "Exploration points by student",
            note: "Top 8",
            bars: [{ key: "value", label: "Points" }],
            build: (rows) =>
                topRows(
                    rows.map((row) => ({
                        name: row.student,
                        value: row.exploration_points || 0,
                    })),
                    8,
                ),
        },
        {
            type: "bar",
            title: "Buildings unlocked by student",
            note: "Selected period",
            bars: [{ key: "value", label: "Buildings" }],
            build: (rows) =>
                topRows(
                    rows.map((row) => ({
                        name: row.student,
                        value: row.buildings_unlocked || 0,
                    })),
                    8,
                ),
        },
    ],
    "quest-performance": [
        {
            type: "bar",
            title: "Quest completions",
            note: "Top 10",
            bars: [{ key: "value", label: "Completions" }],
            build: (rows) =>
                topRows(
                    rows.map((row) => ({
                        name: row.quest,
                        value: row.completed || 0,
                    })),
                    10,
                ),
        },
        {
            type: "pie",
            title: "Assignment outcomes",
            note: "Selected period",
            build: (rows) => {
                const completed = totalOf(rows, "completed");
                const assigned = totalOf(rows, "assigned");
                return [
                    { name: "Completed", value: completed },
                    {
                        name: "Not completed",
                        value: Math.max(assigned - completed, 0),
                    },
                ];
            },
        },
    ],
    "quiz-performance": [
        {
            type: "bar",
            title: "Accuracy by question",
            note: "Top 8",
            bars: [{ key: "value", label: "Accuracy %" }],
            build: (rows) =>
                topRows(
                    rows.map((row) => ({
                        name: row.question,
                        value: row.accuracy || 0,
                    })),
                    8,
                ),
        },
        {
            type: "pie",
            title: "Correct and incorrect attempts",
            note: "Selected period",
            build: (rows) => {
                const attempts = totalOf(rows, "attempts");
                const correct = totalOf(rows, "correct");
                return [
                    { name: "Correct", value: correct },
                    {
                        name: "Incorrect",
                        value: Math.max(attempts - correct, 0),
                    },
                ];
            },
        },
    ],
    "content-readiness": [
        {
            type: "bar",
            title: "Content coverage by building",
            note: "Top 8",
            bars: [
                { key: "quests", label: "Quests" },
                { key: "trivia", label: "Trivia" },
                { key: "quiz", label: "Quiz" },
                { key: "panoramas", label: "Panoramas" },
            ],
            build: (rows) =>
                rows
                    .map((row) => {
                        const item = {
                            name: row.building,
                            quests: row.quests || 0,
                            trivia: row.trivia_facts || 0,
                            quiz: row.quiz_questions || 0,
                            panoramas: row.panorama_scenes || 0,
                        };
                        item.total =
                            item.quests +
                            item.trivia +
                            item.quiz +
                            item.panoramas;
                        return item;
                    })
                    .sort((a, b) => b.total - a.total)
                    .slice(0, 8),
        },
        {
            type: "pie",
            title: "Content items by type",
            note: "All buildings",
            build: (rows) => [
                { name: "Quests", value: totalOf(rows, "quests") },
                { name: "Trivia", value: totalOf(rows, "trivia_facts") },
                { name: "Quiz", value: totalOf(rows, "quiz_questions") },
                { name: "Panoramas", value: totalOf(rows, "panorama_scenes") },
            ],
        },
    ],
    feedback: [
        {
            type: "pie",
            title: "Feedback by status",
            note: "Selected period",
            build: (rows) => countBy(rows, "status"),
        },
        {
            type: "bar",
            title: "Feedback by type",
            note: "Selected period",
            bars: [{ key: "value", label: "Items" }],
            build: (rows) => countBy(rows, "type"),
        },
    ],
};

const TOOLTIP_STYLE = {
    borderRadius: 6,
    border: "1px solid #ebcbcf",
    fontSize: 12,
};

function chartTotal(chart, data) {
    const keys =
        chart.type === "pie" ? ["value"] : chart.bars.map((bar) => bar.key);
    return data.reduce(
        (sum, item) =>
            sum +
            keys.reduce((inner, key) => inner + (Number(item[key]) || 0), 0),
        0,
    );
}

function BarVisual({ chart, data }) {
    return (
        <BarChart
            data={data}
            margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
        >
            <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f1dfe2"
            />
            <XAxis
                dataKey="name"
                interval={0}
                height={44}
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickFormatter={(value) => truncateLabel(value)}
            />
            <YAxis
                width={38}
                allowDecimals={false}
                tick={{ fontSize: 10, fill: "#9ca3af" }}
            />
            <Tooltip cursor={{ fill: "#fdf7f8" }} contentStyle={TOOLTIP_STYLE} />
            {chart.bars.length > 1 && (
                <Legend wrapperStyle={{ fontSize: 11 }} />
            )}
            {chart.bars.map((bar, index) => (
                <Bar
                    key={bar.key}
                    dataKey={bar.key}
                    name={bar.label}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={44}
                />
            ))}
        </BarChart>
    );
}

function AreaVisual({ chart, data, chartId }) {
    return (
        <AreaChart
            data={data}
            margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
        >
            <defs>
                {chart.bars.map((bar, index) => {
                    const color = CHART_COLORS[index % CHART_COLORS.length];
                    return (
                        <linearGradient
                            key={bar.key}
                            id={`${chartId}-${bar.key}`}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                            <stop
                                offset="95%"
                                stopColor={color}
                                stopOpacity={0.02}
                            />
                        </linearGradient>
                    );
                })}
            </defs>
            <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f1dfe2"
            />
            <XAxis
                dataKey="name"
                interval={0}
                height={44}
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickFormatter={(value) => truncateLabel(value)}
            />
            <YAxis
                width={38}
                allowDecimals={false}
                tick={{ fontSize: 10, fill: "#9ca3af" }}
            />
            <Tooltip cursor={{ stroke: "#ebcbcf" }} contentStyle={TOOLTIP_STYLE} />
            {chart.bars.length > 1 && (
                <Legend wrapperStyle={{ fontSize: 11 }} />
            )}
            {chart.bars.map((bar, index) => {
                const color = CHART_COLORS[index % CHART_COLORS.length];
                return (
                    <Area
                        key={bar.key}
                        type="monotone"
                        dataKey={bar.key}
                        name={bar.label}
                        stroke={color}
                        strokeWidth={2.2}
                        fill={`url(#${chartId}-${bar.key})`}
                        fillOpacity={1}
                    />
                );
            })}
        </AreaChart>
    );
}

function PieVisual({ data }) {
    return (
        <PieChart>
            <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={48}
                outerRadius={80}
                paddingAngle={2}
                stroke="#ffffff"
                strokeWidth={2}
            >
                {data.map((item, index) => (
                    <Cell
                        key={item.name}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
    );
}

function ChartCard({ chart, rows, chartStyle }) {
    const data = chart.build(rows);
    const total = chartTotal(chart, data);
    const chartId = slugify(chart.title);

    return (
        <div className="border border-brand-border rounded-md p-4 bg-white">
            <div className="flex items-center justify-between gap-3 mb-3">
                <h4 className="text-sm font-bold text-gray-900">
                    {chart.title}
                </h4>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    {chart.note}
                </span>
            </div>
            {data.length === 0 || total === 0 ? (
                <div className="h-56 flex items-center justify-center text-xs font-medium text-gray-400">
                    No activity for the selected filters.
                </div>
            ) : (
                <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        {chart.type === "pie" ? (
                            <PieVisual data={data} />
                        ) : chartStyle === "area" ? (
                            <AreaVisual
                                chart={chart}
                                data={data}
                                chartId={chartId}
                            />
                        ) : (
                            <BarVisual chart={chart} data={data} />
                        )}
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}

function ReportCharts({
    reportType,
    rows,
    chartStyle,
    onChartStyleChange,
}) {
    const charts = CHART_CONFIG[reportType];
    if (!charts) return null;

    return (
        <div className="report-chart px-6 py-5 border-b border-brand-border bg-gray-50/40">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold text-gray-900">
                        Visual summary
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        {rows.length} records
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mr-1">
                        Chart
                    </span>
                    {["area", "bar"].map((style) => (
                        <button
                            key={style}
                            type="button"
                            onClick={() => onChartStyleChange(style)}
                            className={cn(
                                "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-colors",
                                chartStyle === style
                                    ? "bg-white border-brand-border text-gray-800 shadow-xs"
                                    : "bg-transparent border-transparent text-gray-400 hover:text-gray-600",
                            )}
                        >
                            {style}
                        </button>
                    ))}
                </div>
            </div>
            <div
                className={cn(
                    "grid gap-4",
                    charts.length > 1 && "lg:grid-cols-2",
                )}
            >
                {charts.map((chart) => (
                    <ChartCard
                        key={chart.title}
                        chart={chart}
                        rows={rows}
                        chartStyle={chartStyle}
                    />
                ))}
            </div>
        </div>
    );
}

function ReportTable({ report, rows, className }) {
    return (
        <table
            className={cn(
                "report-print-table w-full text-left text-sm",
                className,
            )}
        >
            <thead>
                <tr className="bg-gray-50/95 backdrop-blur sticky top-0 z-10 border-b border-brand-border text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    {report.columns.map((column) => (
                        <th
                            key={column.key}
                            className={cn(
                                "px-4 py-3 whitespace-nowrap",
                                column.align === "right"
                                    ? "text-right"
                                    : "text-left",
                            )}
                        >
                            {column.label}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {rows.length === 0 ? (
                    <tr>
                        <td
                            colSpan={report.columns.length}
                            className="px-4 py-10 text-center text-sm text-gray-500"
                        >
                            No records match the selected filters.
                        </td>
                    </tr>
                ) : (
                    rows.map((row, index) => (
                        <tr
                            key={`${report.report}-${index}`}
                            className="hover:bg-brand-light/40 transition-colors"
                        >
                            {report.columns.map((column) => (
                                <td
                                    key={column.key}
                                    className={cn(
                                        "px-4 py-2.5 text-gray-700 align-top",
                                        column.align === "right"
                                            ? "text-right whitespace-nowrap font-medium"
                                            : "text-left",
                                    )}
                                >
                                    {displayValue(row[column.key])}
                                </td>
                            ))}
                        </tr>
                    ))
                )}
            </tbody>
        </table>
    );
}

function Field({ label, children }) {
    return (
        <label className="flex flex-col gap-1.5 w-full">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                {label}
            </span>
            {children}
        </label>
    );
}

export default function ReportsPage() {
    const [reportType, setReportType] = useState(REPORTS[0].id);
    const [preset, setPreset] = useState("year");
    const [customFrom, setCustomFrom] = useState(() =>
        toIsoDate(daysAgo(29)),
    );
    const [customTo, setCustomTo] = useState(() => toIsoDate(new Date()));
    const [buildingId, setBuildingId] = useState("");
    const [includeDemo, setIncludeDemo] = useState(false);
    const [includeNames, setIncludeNames] = useState(true);
    const [feedbackStatus, setFeedbackStatus] = useState("all");

    const [buildings, setBuildings] = useState([]);

    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState("");
    const [generatedAt, setGeneratedAt] = useState(null);
    const [chartStyle, setChartStyle] = useState("bar");
    const [page, setPage] = useState(1);

    const meta = REPORTS.find((item) => item.id === reportType) || REPORTS[0];
    const range = preset === "custom" ? { from: customFrom, to: customTo } : presetRange(preset);

    const totalRows = report?.rows?.length || 0;
    const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const pagedRows = report
        ? report.rows.slice(
              (currentPage - 1) * PAGE_SIZE,
              currentPage * PAGE_SIZE,
          )
        : [];

    const filters = useMemo(
        () => ({
            from: meta.dated ? range.from : undefined,
            to: meta.dated ? range.to : undefined,
            building: buildingId || undefined,
            includeDemo: meta.usesDemo ? includeDemo : false,
            includeNames: meta.usesNames ? includeNames : true,
            status: reportType === "feedback" ? feedbackStatus : undefined,
        }),
        [
            meta.dated,
            meta.usesDemo,
            meta.usesNames,
            range.from,
            range.to,
            buildingId,
            includeDemo,
            includeNames,
            reportType,
            feedbackStatus,
        ],
    );

    useEffect(() => {
        let active = true;

        const loadOptions = async () => {
            try {
                const buildingData = await buildingService.getBuildings();
                if (!active) return;
                setBuildings(
                    Array.isArray(buildingData)
                        ? buildingData
                        : buildingData?.results || [],
                );
            } catch (err) {
                console.error("Failed to load report filters", err);
            }
        };

        loadOptions();
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        let active = true;

        const timer = setTimeout(async () => {
            if (!active) return;
            setLoading(true);
            setError("");

            try {
                const data = await reportService.getReport(reportType, filters);
                if (!active) return;
                setReport(data);
                setGeneratedAt(new Date());
                setPage(1);
            } catch (err) {
                if (!active) return;
                setReport(null);
                setError(
                    readError(
                        err,
                        "Could not generate this report. Check your connection and try again.",
                    ),
                );
            } finally {
                if (active) setLoading(false);
            }
        }, 250);

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [reportType, filters]);

    const handleExport = async () => {
        if (!report) return;
        setExporting(true);
        setError("");
        try {
            await reportService.downloadReport(reportType, filters);
        } catch (err) {
            setError(
                readError(
                    err,
                    "Could not export this report. Check your connection and try again.",
                ),
            );
        } finally {
            setExporting(false);
        }
    };

    const handlePrint = () => {
        if (report) window.print();
    };

    return (
        <div className="reports-page space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        Reports and Analytics
                    </h2>
                    <p className="text-gray-500 mt-1">
                        Generate institutional reports from live ARQuest data,
                        then export them as CSV or print them for records.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="secondary"
                        onClick={handleExport}
                        loading={exporting}
                        disabled={!report || loading}
                        className="flex items-center gap-2"
                    >
                        <Download size={15} />
                        <span>Export CSV</span>
                    </Button>
                    <Button
                        onClick={handlePrint}
                        disabled={!report || loading}
                        className="flex items-center gap-2"
                    >
                        <Printer size={15} />
                        <span>Print</span>
                    </Button>
                </div>
            </div>

            <Card className="space-y-5">
                <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Report
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
                        {REPORTS.map((item) => {
                            const Icon = item.icon;
                            const isActive = item.id === reportType;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setReportType(item.id)}
                                    className={cn(
                                        "flex items-center gap-2 rounded-md border px-3 py-2.5 text-left text-xs font-bold transition-all",
                                        isActive
                                            ? "border-brand bg-brand-light text-brand shadow-sm"
                                            : "border-brand-border bg-white text-gray-600 hover:border-brand/50 hover:bg-brand-light/60 hover:text-brand",
                                    )}
                                >
                                    <Icon size={15} className="shrink-0" />
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pt-4 border-t border-brand-border">
                    {meta.dated ? (
                        <Field label="Date range">
                            <select
                                value={preset}
                                onChange={(e) => setPreset(e.target.value)}
                                className={SELECT_CLASS}
                            >
                                {DATE_PRESETS.map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    ) : (
                        <Field label="Date range">
                            <div className="px-3 py-2 bg-gray-50 border border-brand-border rounded-md text-sm font-medium text-gray-500">
                                Current snapshot. No date filter.
                            </div>
                        </Field>
                    )}

                    {meta.dated && preset === "custom" && (
                        <>
                            <Field label="From">
                                <input
                                    type="date"
                                    value={customFrom}
                                    max={customTo}
                                    onChange={(e) =>
                                        setCustomFrom(e.target.value)
                                    }
                                    className={SELECT_CLASS}
                                />
                            </Field>
                            <Field label="To">
                                <input
                                    type="date"
                                    value={customTo}
                                    min={customFrom}
                                    onChange={(e) => setCustomTo(e.target.value)}
                                    className={SELECT_CLASS}
                                />
                            </Field>
                        </>
                    )}

                    <Field label="Building">
                        <select
                            value={buildingId}
                            onChange={(e) => setBuildingId(e.target.value)}
                            className={SELECT_CLASS}
                        >
                            <option value="">All buildings</option>
                            {buildings.map((building) => (
                                <option key={building.id} value={building.id}>
                                    {building.name}
                                </option>
                            ))}
                        </select>
                    </Field>

                    {reportType === "feedback" && (
                        <Field label="Feedback status">
                            <select
                                value={feedbackStatus}
                                onChange={(e) =>
                                    setFeedbackStatus(e.target.value)
                                }
                                className={SELECT_CLASS}
                            >
                                <option value="all">All statuses</option>
                                <option value="open">Open</option>
                                <option value="in_progress">In progress</option>
                                <option value="resolved">Resolved</option>
                            </select>
                        </Field>
                    )}
                </div>

                {(meta.usesDemo || meta.usesNames) && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-4 border-t border-brand-border">
                        {meta.usesDemo && (
                            <Toggle
                                checked={includeDemo}
                                onChange={(e) =>
                                    setIncludeDemo(e.target.checked)
                                }
                                label="Include demo unlocks"
                            />
                        )}
                        {meta.usesNames && (
                            <div className="flex flex-col gap-1">
                                <Toggle
                                    checked={includeNames}
                                    onChange={(e) =>
                                        setIncludeNames(e.target.checked)
                                    }
                                    label="Show student names"
                                />
                                <span className="text-[10px] text-gray-400 font-medium pl-14">
                                    Turn this off to anonymize exported rows.
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </Card>

            {error && (
                <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-md text-sm text-red-600 font-medium">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <Card noPadding className="report-print-area overflow-hidden">
                <div className="px-6 py-5 border-b border-brand-border flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div>
                        <div className="print-only mb-3 pb-3 border-b border-gray-300">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                ARQuest | Western Mindanao State University
                            </p>
                            <p className="text-[10px] text-gray-500 mt-0.5">
                                Official copy generated{" "}
                                {generatedAt
                                    ? generatedAt.toLocaleString()
                                    : "now"}
                            </p>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <FileBarChart size={18} className="text-brand" />
                            {report?.title || meta.label}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1 max-w-3xl">
                            {report?.description ||
                                "Select a report to preview the available data."}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {report?.period && (
                            <Badge variant="brand">
                                {formatDate(report.period.from)} to{" "}
                                {formatDate(report.period.to)}
                            </Badge>
                        )}
                        <Badge variant="gray">
                            {loading
                                ? "Updating"
                                : `${report?.rows?.length ?? 0} rows`}
                        </Badge>
                        {meta.usesNames && !includeNames && (
                            <Badge variant="warning">Anonymized</Badge>
                        )}
                        {meta.usesDemo && includeDemo && (
                            <Badge variant="warning">Demo included</Badge>
                        )}
                    </div>
                </div>

                {!report ? (
                    <div className="p-10 text-center text-sm text-gray-500 flex flex-col items-center gap-2">
                        {loading ? (
                            <>
                                <RefreshCw
                                    size={18}
                                    className="animate-spin text-brand"
                                />
                                <span>Generating report...</span>
                            </>
                        ) : (
                            <span>No report data available yet.</span>
                        )}
                    </div>
                ) : (
                    <>
                        {Array.isArray(report.summary) &&
                            report.summary.length > 0 && (
                                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 px-6 py-5 border-b border-brand-border bg-gray-50/40">
                                    {report.summary.map((item) => (
                                        <div
                                            key={item.label}
                                            className="bg-white border border-brand-border rounded-md px-3 py-2.5"
                                        >
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                {item.label}
                                            </p>
                                            <p className="text-lg font-bold text-gray-900 mt-0.5 break-words">
                                                {displayValue(item.value)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}

                        <ReportCharts
                            reportType={report.report}
                            rows={report.rows}
                            chartStyle={chartStyle}
                            onChartStyleChange={setChartStyle}
                        />

                        <div
                            className={cn(
                                "print-hidden report-print-scroll overflow-auto max-h-[34rem] transition-opacity",
                                loading && "opacity-60",
                            )}
                        >
                            <ReportTable report={report} rows={pagedRows} />
                        </div>

                        <div className="print-hidden">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setPage}
                            />
                            <div className="px-6 py-3 border-t border-brand-border bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <p className="text-[11px] text-gray-400 font-medium">
                                    {totalRows > 0
                                        ? `Showing ${(currentPage - 1) * PAGE_SIZE + 1} to ${Math.min(currentPage * PAGE_SIZE, totalRows)} of ${totalRows} rows.`
                                        : "No rows in this report."}{" "}
                                    Exports and print include every row.
                                </p>
                                <p className="text-[11px] text-gray-400 font-medium">
                                    {generatedAt
                                        ? `Generated ${generatedAt.toLocaleString()}`
                                        : ""}
                                </p>
                            </div>
                        </div>

                        <div className="print-only px-6 py-4">
                            <ReportTable report={report} rows={report.rows} />
                        </div>
                    </>
                )}
            </Card>
        </div>
    );
}
