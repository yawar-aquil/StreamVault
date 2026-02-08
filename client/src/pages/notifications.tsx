import { useNotifications } from "@/contexts/notifications-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Check, Trash2, Mail, UserPlus, Users, MessageSquare, Star, Trophy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function NotificationsPage() {
    const { notifications, isLoading, markAsRead, markAllAsRead, deleteNotification, unreadCount } = useNotifications();

    const getIcon = (type: string) => {
        switch (type) {
            case 'friend_request':
                return <UserPlus className="h-4 w-4 text-blue-500" />;
            case 'friend_accepted':
                return <Users className="h-4 w-4 text-green-500" />;
            case 'room_invite':
                return <MessageSquare className="h-4 w-4 text-purple-500" />;
            case 'dm':
                return <Mail className="h-4 w-4 text-yellow-500" />;
            case 'announcement':
                return <Bell className="h-4 w-4 text-red-500" />;
            case 'xp_earned':
                return <Star className="h-4 w-4 text-yellow-400" />;
            case 'achievement':
                return <Trophy className="h-4 w-4 text-amber-500" />;
            default:
                return <Bell className="h-4 w-4" />;
        }
    };

    if (isLoading) {
        return (
            <div className="container mx-auto py-8 px-4 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Notifications</h1>
                    <p className="text-muted-foreground mt-1">
                        You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <Button variant="outline" onClick={() => markAllAsRead()} size="sm">
                        <Check className="mr-2 h-4 w-4" />
                        Mark all read
                    </Button>
                )}
            </div>

            <Card className="bg-card/50 backdrop-blur">
                <CardContent className="p-0">
                    <ScrollArea className="h-[600px]">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Bell className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                                <h3 className="text-lg font-medium">No notifications</h3>
                                <p className="text-muted-foreground">
                                    You're all caught up! Check back later for updates.
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`flex items-start gap-4 p-4 transition-colors hover:bg-muted/50 ${!notification.read ? "bg-muted/30" : ""
                                            }`}
                                    >
                                        <div className="mt-1 bg-background p-2 rounded-full border shadow-sm">
                                            {getIcon(notification.type)}
                                        </div>

                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <p className={`text-sm font-medium ${!notification.read ? "text-foreground" : "text-muted-foreground"}`}>
                                                    {notification.title}
                                                </p>
                                                <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                                                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {notification.message}
                                            </p>
                                            {!notification.read && (
                                                <div className="pt-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-auto py-1 px-2 text-xs"
                                                        onClick={() => markAsRead(notification.id)}
                                                    >
                                                        Mark as read
                                                    </Button>
                                                </div>
                                            )}
                                        </div>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => deleteNotification(notification.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">Delete</span>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
