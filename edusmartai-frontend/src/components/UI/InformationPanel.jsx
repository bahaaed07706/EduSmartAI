// src/components/UI/InformationPanel.jsx
// Reusable Information Panel component - ready for Power BI integration
import React from "react";
import { BarChart3, RefreshCw, ExternalLink } from "lucide-react";

/**
 * Information Panel Component
 * 
 * This component displays data visualizations and analytics.
 * It can be connected to external APIs like Power BI.
 * 
 * Props:
 * - title: Panel title
 * - subtitle: Panel subtitle (optional)
 * - data: Array of data items to display
 * - loading: Whether data is loading
 * - onRefresh: Function to refresh data (optional)
 * - externalUrl: URL to open in external tool like Power BI (optional)
 * - children: Custom content to render inside the panel
 */
const InformationPanel = ({
    title = "Information Panel",
    subtitle = "",
    data = null,
    loading = false,
    onRefresh = null,
    externalUrl = null,
    children = null,
    className = "",
}) => {
    return (
        <div
            className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${className}`}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <BarChart3 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
                        {subtitle && (
                            <p className="text-[11px] text-slate-500">{subtitle}</p>
                        )}
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                    {onRefresh && (
                        <button
                            onClick={onRefresh}
                            disabled={loading}
                            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
                            title="Refresh data"
                        >
                            <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    )}
                    {externalUrl && (
                        <a
                            href={externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                            title="Open in Power BI"
                        >
                            <ExternalLink className="h-4 w-4 text-slate-500" />
                        </a>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="flex flex-col items-center gap-2">
                            <RefreshCw className="h-6 w-6 text-primary animate-spin" />
                            <p className="text-xs text-slate-500">Loading data...</p>
                        </div>
                    </div>
                ) : children ? (
                    children
                ) : data ? (
                    <div className="space-y-3">
                        {data.map((item, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    {item.icon && (
                                        <div className={`p-2 rounded-lg ${item.iconBg || 'bg-primary/10'}`}>
                                            {item.icon}
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">{item.label}</p>
                                        {item.description && (
                                            <p className="text-[11px] text-slate-500">{item.description}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-lg font-semibold ${item.valueColor || 'text-primary'}`}>
                                        {item.value}
                                    </p>
                                    {item.trend && (
                                        <p className={`text-[10px] ${item.trend > 0 ? 'text-emerald-600' : item.trend < 0 ? 'text-red-600' : 'text-slate-500'
                                            }`}>
                                            {item.trend > 0 ? '↑' : item.trend < 0 ? '↓' : '→'} {Math.abs(item.trend)}%
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center py-8">
                        <p className="text-sm text-slate-500">No data available</p>
                    </div>
                )}
            </div>

            {/* Footer - for Power BI connection info */}
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    Ready for Power BI integration
                    {externalUrl && (
                        <span className="ml-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                            Connected
                        </span>
                    )}
                </p>
            </div>
        </div>
    );
};

export default InformationPanel;
