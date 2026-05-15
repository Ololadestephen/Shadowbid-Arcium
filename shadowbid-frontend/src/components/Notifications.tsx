import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'info';

type Notification = {
    id: number;
    type: NotificationType;
    title: string;
    message?: string;
};

type NotifyInput = Omit<Notification, 'id'> & {
    duration?: number;
};

type NotificationContextValue = {
    notify: (notification: NotifyInput) => void;
    dismiss: (id: number) => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

const styles: Record<NotificationType, { icon: typeof Info; accent: string }> = {
    success: { icon: CheckCircle2, accent: 'text-status-success' },
    error: { icon: AlertTriangle, accent: 'text-status-error' },
    info: { icon: Info, accent: 'text-accent-cyan' },
};

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const dismiss = useCallback((id: number) => {
        setNotifications((current) => current.filter((item) => item.id !== id));
    }, []);

    const notify = useCallback((notification: NotifyInput) => {
        const id = Date.now() + Math.floor(Math.random() * 1000);
        setNotifications((current) => [
            ...current.slice(-2),
            {
                id,
                type: notification.type,
                title: notification.title,
                message: notification.message,
            },
        ]);

        window.setTimeout(() => dismiss(id), notification.duration ?? 5200);
    }, [dismiss]);

    const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss]);

    return (
        <NotificationContext.Provider value={value}>
            {children}
            <div className="fixed right-4 top-20 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3">
                {notifications.map((notification) => {
                    const Icon = styles[notification.type].icon;

                    return (
                        <div
                            key={notification.id}
                            className="rounded-lg border border-border bg-background-card p-4 shadow-2xl"
                            role="status"
                        >
                            <div className="flex items-start gap-3">
                                <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${styles[notification.type].accent}`} />
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-text-primary">{notification.title}</p>
                                    {notification.message && (
                                        <p className="mt-1 text-sm leading-5 text-text-secondary">
                                            {notification.message}
                                        </p>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    aria-label="Dismiss notification"
                                    onClick={() => dismiss(notification.id)}
                                    className="rounded p-1 text-text-muted transition-colors hover:bg-background-elevated hover:text-text-primary"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);

    if (!context) {
        throw new Error('useNotifications must be used inside NotificationProvider');
    }

    return context;
};
