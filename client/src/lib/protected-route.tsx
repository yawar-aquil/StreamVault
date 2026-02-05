import { useAuth } from "@/contexts/auth-context";
import { Redirect, Route, useLocation } from "wouter";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
    component: React.ComponentType<any>;
    path?: string;
}

export function ProtectedRoute({ component: Component, path }: ProtectedRouteProps) {
    const { user, isLoading } = useAuth();
    const [location] = useLocation();

    // Show loading spinner while checking auth status
    if (isLoading) {
        return (
            <Route path={path}>
                <div className="flex items-center justify-center min-h-screen bg-background">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </Route>
        );
    }

    // If not authenticated, redirect to login
    // We can pass the current location to redirect back after login later if needed
    if (!user) {
        return (
            <Route path={path}>
                <Redirect to="/register" />
            </Route>
        );
    }

    // If authenticated, render the component
    return <Route path={path} component={Component} />;
}
