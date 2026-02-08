import { useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, UserPlus, MessageCircle, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotifications } from '@/contexts/notifications-context';
import { useLocation } from 'wouter';
import { formatDistanceToNow } from 'date-fns';

export function NotificationsDropdown() {
    const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
    const [, setLocation] = useLocation();
    const [open, setOpen] = useState(false);

    const getIcon = (type: string) => {
        switch (type) {
            case 'friend_request':
                return <UserPlus className="h-4 w-4 text-blue-500" />;
            case 'friend_accepted':
                return <Users className="h-4 w-4 text-green-500" />;
            case 'dm':
                return <MessageCircle className="h-4 w-4 text-purple-500" />;
            case 'new_content':
            case 'new_episode':
                return <Check className="h-4 w-4 text-primary" />;
            case 'announcement':
                return <Bell className="h-4 w-4 text-yellow-500" />;
            default:
                return <Bell className="h-4 w-4 text-muted-foreground" />;
        }
    };

    const handleNotificationClick = async (notification: typeof notifications[0]) => {
        if (!notification.read) {
            await markAsRead(notification.id);
        }

        if (notification.data?.link) {
            // Support explicit links from admin broadcast
            setLocation(notification.data.link as string);
            setOpen(false);
            return;
        }

        // Navigate based on type
        switch (notification.type) {
            case 'friend_request':
            case 'friend_accepted':
                setLocation('/friends');
                break;
            case 'dm':
                const fromUserId = notification.data?.fromUserId as string;
                if (fromUserId) {
                    setLocation(`/friends?dm=${fromUserId}`);
                } else {
                    setLocation('/friends');
                }
                break;
            case 'room_invite':
                const roomCode = notification.data?.roomCode as string;
                if (roomCode) {
                    setLocation(`/watch-together/${roomCode}`);
                }
                break;
            case 'new_content':
            case 'new_episode':
                const contentType = notification.data?.contentType as string;
                const contentId = notification.data?.contentId as string;
                if (contentType && contentId) {
                    if (contentType === 'show') setLocation(`/show/${contentId}`);
                    else if (contentType === 'movie') setLocation(`/movie/${contentId}`);
                    else if (contentType === 'anime') setLocation(`/anime/${contentId}`);
                }
                break;
        }

        setOpen(false);
    };

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between p-3 border-b">
                    <h3 className="font-semibold">Notifications</h3>
                    {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-8 text-xs">
                            <CheckCheck className="h-3 w-3 mr-1" />
                            Mark all read
                        </Button>
                    )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-6 text-center text-muted-foreground">
                            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No notifications yet</p>
                        </div>
                    ) : (
                        notifications.slice(0, 10).map((notification) => (
                            <div
                                key={notification.id}
                                className={`flex items-start gap-3 p-3 border-b last:border-0 cursor-pointer transition-colors hover:bg-accent/50 ${!notification.read ? 'bg-accent/30' : ''
                                    }`}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                {/* Notification Image or Icon */}
                                <div className="mt-1 flex-shrink-0">
                                    {notification.data?.contentPoster ? (
                                        <img
                                            src={notification.data.contentPoster}
                                            alt=""
                                            className="w-10 h-14 object-cover rounded shadow-sm"
                                        />
                                    ) : (
                                        getIcon(notification.type)
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{notification.title}</p>
                                    <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1">
                                    {!notification.read && (
                                        <div className="w-2 h-2 bg-primary rounded-full" />
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/20"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteNotification(notification.id);
                                        }}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {notifications.length > 10 && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="justify-center text-primary"
                            onClick={() => {
                                setLocation('/notifications');
                                setOpen(false);
                            }}
                        >
                            View all notifications
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
