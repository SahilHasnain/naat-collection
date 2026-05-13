"use client";

import { useEffect, useState } from "react";

interface DatabaseStats {
    total: number;
    withAudioId: number;
    withCutAudio: number;
    withCutSegments: number;
    cutStatusNull: number;
    cutStatusDone: number;
    cutStatusFailed: number;
    cutStatusProcessing: number;
    inconsistentCutStatus: number;
    eligibleForProcessing: number;
    cutSegmentsButNoCutAudio: number;
}

export default function DatabaseStatusPage() {
    const [stats, setStats] = useState<DatabaseStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch("/api/admin/database-status");
            if (!response.ok) throw new Error("Failed to fetch stats");
            const data = await response.json();
            setStats(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 text-white p-8">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-3xl font-bold mb-8">Database Status</h1>
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-900 text-white p-8">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-3xl font-bold mb-8">Database Status</h1>
                    <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
                        <p className="text-red-400">Error: {error}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!stats) return null;

    const percentage = (value: number) =>
        ((value / stats.total) * 100).toFixed(1);

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold">Database Status</h1>
                    <button
                        onClick={fetchStats}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                        Refresh
                    </button>
                </div>

                {/* Overview */}
                <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
                    <h2 className="text-2xl font-semibold mb-4">Overview</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <StatCard
                            label="Total Naats"
                            value={stats.total}
                            color="blue"
                        />
                        <StatCard
                            label="With Audio"
                            value={stats.withAudioId}
                            percentage={percentage(stats.withAudioId)}
                            color="green"
                        />
                        <StatCard
                            label="With Cut Audio"
                            value={stats.withCutAudio}
                            percentage={percentage(stats.withCutAudio)}
                            color="purple"
                        />
                        <StatCard
                            label="With Cut Segments"
                            value={stats.withCutSegments}
                            percentage={percentage(stats.withCutSegments)}
                            color="indigo"
                        />
                    </div>
                </div>

                {/* Cut Status Breakdown */}
                <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
                    <h2 className="text-2xl font-semibold mb-4">Cut Status Breakdown</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <StatCard
                            label="NULL"
                            value={stats.cutStatusNull}
                            percentage={percentage(stats.cutStatusNull)}
                            color="gray"
                        />
                        <StatCard
                            label="Done"
                            value={stats.cutStatusDone}
                            percentage={percentage(stats.cutStatusDone)}
                            color="green"
                        />
                        <StatCard
                            label="Failed"
                            value={stats.cutStatusFailed}
                            percentage={percentage(stats.cutStatusFailed)}
                            color="red"
                        />
                        <StatCard
                            label="Processing"
                            value={stats.cutStatusProcessing}
                            percentage={percentage(stats.cutStatusProcessing)}
                            color="yellow"
                        />
                    </div>
                </div>

                {/* Issues & Alerts */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-2xl font-semibold mb-4">Issues & Alerts</h2>
                    <div className="space-y-4">
                        <IssueCard
                            title="Inconsistent Cut Status"
                            description="Naats with cutStatus='done' but cutAudio is NULL"
                            value={stats.inconsistentCutStatus}
                            severity={stats.inconsistentCutStatus > 0 ? "error" : "success"}
                            action={
                                stats.inconsistentCutStatus > 0
                                    ? "These need cutStatus reset to NULL"
                                    : "No issues found"
                            }
                        />
                        <IssueCard
                            title="Eligible for Processing"
                            description="Naats ready to be processed by cut-audio function"
                            value={stats.eligibleForProcessing}
                            severity={stats.eligibleForProcessing > 0 ? "info" : "success"}
                            action={
                                stats.eligibleForProcessing > 0
                                    ? "Run cut-audio cron to process these"
                                    : "All caught up"
                            }
                        />
                        <IssueCard
                            title="Cut Segments Without Cut Audio"
                            description="Naats with cutSegments but missing cutAudio file"
                            value={stats.cutSegmentsButNoCutAudio}
                            severity={stats.cutSegmentsButNoCutAudio > 0 ? "warning" : "success"}
                            action={
                                stats.cutSegmentsButNoCutAudio > 0
                                    ? `${stats.cutSegmentsButNoCutAudio} naats need audio cutting`
                                    : "All segments have audio"
                            }
                        />
                    </div>
                </div>

                {/* Legend */}
                <div className="mt-6 bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold mb-3">Field Descriptions</h3>
                    <div className="space-y-2 text-sm text-gray-300">
                        <p>
                            <span className="font-semibold text-white">audioId:</span> Original
                            audio file extracted from YouTube
                        </p>
                        <p>
                            <span className="font-semibold text-white">cutAudio:</span> Processed
                            audio with explanations removed
                        </p>
                        <p>
                            <span className="font-semibold text-white">cutSegments:</span>{" "}
                            Timestamp data of segments to remove
                        </p>
                        <p>
                            <span className="font-semibold text-white">cutStatus:</span> Processing
                            status (null, done, failed, processing)
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({
    label,
    value,
    percentage,
    color,
}: {
    label: string;
    value: number;
    percentage?: string;
    color: string;
}) {
    const colorClasses = {
        blue: "bg-blue-900/30 border-blue-500",
        green: "bg-green-900/30 border-green-500",
        purple: "bg-purple-900/30 border-purple-500",
        indigo: "bg-indigo-900/30 border-indigo-500",
        gray: "bg-gray-700/30 border-gray-500",
        red: "bg-red-900/30 border-red-500",
        yellow: "bg-yellow-900/30 border-yellow-500",
    };

    return (
        <div
            className={`rounded-lg p-4 border ${colorClasses[color as keyof typeof colorClasses]}`}
        >
            <div className="text-sm text-gray-400 mb-1">{label}</div>
            <div className="text-2xl font-bold">{value.toLocaleString()}</div>
            {percentage && (
                <div className="text-sm text-gray-400 mt-1">{percentage}%</div>
            )}
        </div>
    );
}

function IssueCard({
    title,
    description,
    value,
    severity,
    action,
}: {
    title: string;
    description: string;
    value: number;
    severity: "success" | "info" | "warning" | "error";
    action: string;
}) {
    const severityClasses = {
        success: "bg-green-900/20 border-green-500",
        info: "bg-blue-900/20 border-blue-500",
        warning: "bg-yellow-900/20 border-yellow-500",
        error: "bg-red-900/20 border-red-500",
    };

    const iconClasses = {
        success: "text-green-400",
        info: "text-blue-400",
        warning: "text-yellow-400",
        error: "text-red-400",
    };

    return (
        <div
            className={`rounded-lg p-4 border ${severityClasses[severity]}`}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">{title}</h3>
                    <p className="text-sm text-gray-400 mb-2">{description}</p>
                    <div className="flex items-center gap-4">
                        <span className={`text-2xl font-bold ${iconClasses[severity]}`}>
                            {value.toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-400">{action}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
