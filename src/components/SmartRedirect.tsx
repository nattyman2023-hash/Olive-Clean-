import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/**
 * Redirect authenticated users from "/" to their appropriate dashboard.
 * Only triggers on the "/" route so it doesn't interfere with deep links.
 */
export default function SmartRedirect() {
  const { user, isAdmin, isStaff, isClient, isFinance, loading, rolesLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    if (hasRedirected || loading || rolesLoading || location.pathname !== "/") return;
    if (!user) return;

    setHasRedirected(true);

    if (isAdmin) {
      navigate("/admin", { replace: true });
    } else if (isFinance) {
      navigate("/finance", { replace: true });
    } else if (isStaff) {
      navigate("/employee", { replace: true });
    } else if (isClient) {
      navigate("/client", { replace: true });
    }
  }, [user, isAdmin, isStaff, isClient, isFinance, loading, rolesLoading, hasRedirected, location.pathname, navigate]);

  return null;
}
