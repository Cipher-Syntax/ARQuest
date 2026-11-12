import api from "./api";

/**
 * Translate the page's filter state into the query parameters the report
 * endpoints understand. Empty values are omitted so the backend defaults
 * (last 30 days, demo unlocks excluded, names included) stay in charge.
 */
function buildParams(filters = {}) {
    const {
        from,
        to,
        building,
        includeDemo,
        includeNames,
        status,
        type,
    } = filters;

    const params = {};

    if (from) params.from = from;
    if (to) params.to = to;
    if (building) params.building = building;
    if (includeDemo) params.include_demo = "true";
    if (includeNames === false) params.include_names = "false";
    if (status && status !== "all") params.status = status;
    if (type && type !== "all") params.type = type;

    return params;
}

function filenameFromDisposition(disposition, reportType) {
    const match = /filename="?([^";]+)"?/i.exec(disposition || "");
    if (match?.[1]) return match[1];
    const today = new Date().toISOString().slice(0, 10);
    return `arquest-${reportType}-${today}.csv`;
}

export const reportService = {
    getReport: async (reportType, filters) => {
        const response = await api.get(`/api/reports/${reportType}/`, {
            params: buildParams(filters),
        });
        return response.data.data;
    },

    downloadReport: async (reportType, filters) => {
        const response = await api.get(`/api/reports/${reportType}/`, {
            params: { ...buildParams(filters), export: "csv" },
            responseType: "blob",
        });

        const filename = filenameFromDisposition(
            response.headers?.["content-disposition"],
            reportType,
        );
        const url = URL.createObjectURL(response.data);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        return filename;
    },
};
