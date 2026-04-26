import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import type { AppRole } from "@/lib/types";

interface ProtectedRouteProps {
  children: ReactNode;
  requireRole?: AppRole;
  requireOnboarding?: boolean;
}

export function ProtectedRoute({ children, requireRole, requireOnboarding }: ProtectedRouteProps) {
  const { user, role, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  if (requireRole && role !== requireRole) {
    // Redirect to the area that matches their actual role
    const target = role === "admin" ? "/admin" : "/app/discover";
    return <Navigate to={target} replace />;
  }

  if (requireOnboarding && role === "citizen" && profile && !profile.onboarding_completed) {
    return <Navigate to="/app/onboarding" replace />;
  }

  return <>{children}</>;
}
