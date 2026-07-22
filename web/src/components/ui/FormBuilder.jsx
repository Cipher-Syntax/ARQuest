import { Input } from "./index";

export function FormBuilder({ fields, formData, setFormData, errors = {} }) {
    const renderField = (field) => {
        const value = formData[field.name] !== undefined ? formData[field.name] : "";
        const error = errors[field.name];

        const handleChange = (e) => {
            const val = e.target ? e.target.value : e;
            setFormData({ ...formData, [field.name]: val });
        };

        switch (field.type) {
            case "select":
                return (
                    <div className="space-y-2">
                        {field.label && (
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                {field.label}
                            </label>
                        )}
                        <select
                            value={value}
                            onChange={handleChange}
                            className={`w-full border rounded-md bg-white text-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer font-bold ${
                                error ? "border-red-400" : "border-brand-border"
                            }`}
                        >
                            {field.options?.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        {error && (
                            <p className="text-[10px] text-red-500 font-medium">{error}</p>
                        )}
                    </div>
                );
            case "toggleGroup":
                return (
                    <div className="space-y-2">
                        {field.label && (
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                {field.label}
                            </label>
                        )}
                        <div className="flex gap-2">
                            {field.options?.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, [field.name]: opt.value })}
                                    className={`flex-1 py-2.5 rounded-md text-sm font-bold capitalize transition-all ${
                                        value === opt.value
                                            ? "bg-brand text-white shadow-sm"
                                            : "bg-gray-50 text-gray-500 hover:bg-brand-light"
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        {error && (
                            <p className="text-[10px] text-red-500 font-medium">{error}</p>
                        )}
                    </div>
                );
            case "textarea":
                return (
                    <div className="space-y-2">
                        {field.label && (
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                {field.label}
                            </label>
                        )}
                        <textarea
                            value={value}
                            onChange={handleChange}
                            rows={field.rows || 4}
                            placeholder={field.placeholder}
                            className={`w-full border rounded-md bg-white text-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none font-medium ${
                                error ? "border-red-400" : "border-brand-border"
                            }`}
                        />
                        {error && (
                            <p className="text-[10px] text-red-500 font-medium">{error}</p>
                        )}
                    </div>
                );
            default:
                return (
                    <Input
                        label={field.label}
                        type={field.type || "text"}
                        placeholder={field.placeholder}
                        value={value}
                        onChange={handleChange}
                        error={error}
                    />
                );
        }
    };

    const rows = [];
    let currentRow = [];
    fields.forEach((field) => {
        if (field.width === "half") {
            currentRow.push(field);
            if (currentRow.length === 2) {
                rows.push(currentRow);
                currentRow = [];
            }
        } else {
            if (currentRow.length > 0) {
                rows.push(currentRow);
                currentRow = [];
            }
            rows.push([field]);
        }
    });
    if (currentRow.length > 0) {
        rows.push(currentRow);
    }

    return (
        <div className="space-y-5">
            {rows.map((row, idx) => (
                <div key={idx} className={`grid gap-4 ${row.length > 1 ? `grid-cols-2` : "grid-cols-1"}`}>
                    {row.map((field) => (
                        <div key={field.name}>{renderField(field)}</div>
                    ))}
                </div>
            ))}
        </div>
    );
}
