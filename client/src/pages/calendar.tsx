import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Bell, Clock, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";

interface CalendarEvent {
    id: string;
    title: string;
    start: string;
    type: "release" | "reminder";
    contentId?: string;
    contentType?: "show" | "movie" | "anime";
}

export default function Calendar() {
    const { data: events, isLoading } = useQuery<CalendarEvent[]>({
        queryKey: ["/api/calendar"],
    });

    // Group events by month
    const groupedEvents = events?.reduce((acc, event) => {
        const date = new Date(event.start);
        const monthKey = format(date, "MMMM yyyy");
        if (!acc[monthKey]) acc[monthKey] = [];
        acc[monthKey].push(event);
        return acc;
    }, {} as Record<string, CalendarEvent[]>) || {};

    const sortedMonths = Object.keys(groupedEvents).sort((a, b) =>
        new Date(a).getTime() - new Date(b).getTime()
    );

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <CalendarIcon className="w-8 h-8 text-primary" />
                Release Calendar
            </h1>
            <p className="text-muted-foreground mb-8">
                Your upcoming reminders and new releases.
            </p>

            {isLoading ? (
                <div className="space-y-8">
                    {[1, 2].map((i) => (
                        <div key={i} className="space-y-4">
                            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
                            <div className="space-y-3">
                                <div className="h-24 w-full bg-muted rounded-xl animate-pulse" />
                                <div className="h-24 w-full bg-muted rounded-xl animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : Object.keys(groupedEvents).length > 0 ? (
                <div className="space-y-12">
                    {sortedMonths.map((month) => (
                        <div key={month} className="relative">
                            <h2 className="text-2xl font-bold mb-6 sticky top-20 bg-background/95 backdrop-blur py-2 z-10 border-b border-border">
                                {month}
                            </h2>
                            <div className="space-y-4">
                                {groupedEvents[month]
                                    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                                    .map((event) => {
                                        const eventDate = new Date(event.start);
                                        const isReminder = event.type === 'reminder';

                                        return (
                                            <div
                                                key={event.id}
                                                className="group relative flex items-center gap-6 p-4 rounded-xl bg-card/50 border border-border hover:bg-accent transition-all hover:scale-[1.01]"
                                            >
                                                {/* Date Badge */}
                                                <div className="flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                                                    <span className="text-2xl font-bold">{format(eventDate, "d")}</span>
                                                    <span className="text-xs font-medium uppercase">{format(eventDate, "EEE")}</span>
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {isReminder && (
                                                            <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                                                <Bell className="w-3 h-3" />
                                                                Reminder
                                                            </span>
                                                        )}
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${event.contentType === 'movie' ? 'bg-blue-500/20 text-blue-500' :
                                                            event.contentType === 'anime' ? 'bg-pink-500/20 text-pink-500' :
                                                                'bg-green-500/20 text-green-500'
                                                            }`}>
                                                            {event.contentType || 'Event'}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-lg font-bold truncate group-hover:text-primary transition-colors">
                                                        {event.title.replace('Reminder: ', '')}
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                                                        <Clock className="w-3 h-3" />
                                                        {format(eventDate, "h:mm a")}
                                                    </p>
                                                </div>

                                                {/* Action */}
                                                {event.contentId && (
                                                    <Link href={`/${event.contentType === 'show' ? 'show' : event.contentType === 'anime' ? 'anime' : 'movie'}/${event.contentId}`}>
                                                        <a className="p-3 rounded-full bg-white/5 hover:bg-primary hover:text-white transition-colors">
                                                            <ChevronRight className="w-5 h-5" />
                                                        </a>
                                                    </Link>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>

                            {/* Connector Line */}
                            <div className="absolute left-8 top-16 bottom-0 w-px bg-gradient-to-b from-border to-transparent -z-10 hidden md:block" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20">
                    <CalendarIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                    <h2 className="text-2xl font-semibold mb-2">No upcoming events</h2>
                    <p className="text-muted-foreground">
                        Set reminders for your favorite shows to see them here!
                    </p>
                </div>
            )}
        </div>
    );
}
