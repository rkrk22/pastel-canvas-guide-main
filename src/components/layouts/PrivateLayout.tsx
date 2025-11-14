import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";

export const PrivateLayout = () => {
  const { initializing, user, session } = useAuth();
  const isAuthenticated = !!(user && session);

  if (!isAuthenticated && !initializing) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
};
