import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { Activity, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

interface ApiKey {
    id: string;
    key: string;
    name: string;
    scope: string;
    createdAt: string;
    lastUsed?: string;
    requestsToday: number;
    totalRequests: number;
    usageHistory: Record<string, number>;
}

interface ApiUsageModalProps {
    open: boolean;
    onClose: () => void;
    apiKey: ApiKey | null;
}

export function ApiUsageModal({ open, onClose, apiKey }: ApiUsageModalProps) {
    if (!apiKey) return null;

    const DAILY_LIMIT = 1000;
    const requestsToday = apiKey.requestsToday || 0;
    const percentage = Math.min((requestsToday / DAILY_LIMIT) * 100, 100);

    // Transform usage history for chart
    const historyData = (() => {
        const days = [];
        const today = new Date();

        // Generate last 7 days
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

            // For today, use requestsToday. For past days, lookup in history or default to 0
            let usage = 0;
            if (i === 0) {
                usage = requestsToday;
            } else {
                usage = apiKey.usageHistory?.[dateStr] || 0;
            }

            days.push({
                day: i === 0 ? 'Today' : dayName,
                fullDate: dateStr,
                usage: usage
            });
        }
        return days;
    })();

    const getStatusColor = (percent: number) => {
        if (percent >= 90) return "text-destructive";
        if (percent >= 75) return "text-yellow-500";
        return "text-green-500";
    };

    const getProgressBarColor = (percent: number) => {
        if (percent >= 90) return "bg-destructive";
        if (percent >= 75) return "bg-yellow-500";
        return "bg-green-500";
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] border-border/50 bg-background/95 backdrop-blur-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Activity className="h-5 w-5 text-primary" />
                        API Usage Statistics
                    </DialogTitle>
                    <DialogDescription>
                        Usage data for key: <span className="font-mono text-foreground font-medium">{apiKey.name}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Main Status Card */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
                            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <div className="text-sm font-medium text-muted-foreground">Requests Today</div>
                                <Activity className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="text-2xl font-bold">{requestsToday}</div>
                            <p className="text-xs text-muted-foreground">
                                Total requests today
                            </p>
                        </div>

                        <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
                            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <div className="text-sm font-medium text-muted-foreground">Daily Limit</div>
                                <Clock className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="text-2xl font-bold">{DAILY_LIMIT}</div>
                            <p className="text-xs text-muted-foreground">
                                Requests per day
                            </p>
                        </div>

                        <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
                            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <div className="text-sm font-medium text-muted-foreground">Status</div>
                                <CheckCircle2 className={`h-4 w-4 ${getStatusColor(percentage)}`} />
                            </div>
                            <div className={`text-2xl font-bold ${getStatusColor(percentage)}`}>
                                {percentage < 100 ? 'Active' : 'Limited'}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {Math.max(0, DAILY_LIMIT - requestsToday)} remaining today
                            </p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Daily Usage: {percentage.toFixed(1)}%</span>
                            <span className="text-muted-foreground">{requestsToday} / {DAILY_LIMIT} used</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                            <div
                                className={`h-full transition-all ${getProgressBarColor(percentage)}`}
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium mb-4">Activity (Last 7 Days)</h3>
                        <div className="h-[200px] w-full rounded-lg border bg-card/50 p-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={historyData}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                                    <XAxis
                                        dataKey="day"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        opacity={0.5}
                                    />
                                    <YAxis
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        opacity={0.5}
                                        hide
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--popover))',
                                            borderRadius: '8px',
                                            border: '1px solid hsl(var(--border))',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                                        }}
                                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                                    />
                                    <Bar dataKey="usage" radius={[4, 4, 0, 0]}>
                                        {historyData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.day === 'Today' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}
                                                opacity={entry.day === 'Today' ? 1 : 0.3}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3 flex gap-3 items-start">
                        <Clock className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <h4 className="text-sm font-medium text-yellow-500">Rate Limit Info</h4>
                            <p className="text-xs text-muted-foreground">
                                Limits are reset automatically at 00:00 UTC. If you require a higher limit for a commercial integration, please contact support.
                            </p>
                        </div>
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    );
}
