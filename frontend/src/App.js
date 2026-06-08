import "@/index.css";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { DataProvider } from "@/context/DataContext";
import { Toaster } from "@/components/ui/sonner";
import Auth from "@/pages/Auth";
import Layout from "@/pages/Layout";
import Week from "@/pages/Week";
import Monthly from "@/pages/Monthly";
import Goals from "@/pages/Goals";
import CalendarPage from "@/pages/CalendarPage";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <DataProvider>{children}</DataProvider>;
}

function Guest({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Guest><Auth mode="login" /></Guest>} />
          <Route path="/register" element={<Guest><Auth mode="register" /></Guest>} />
          <Route path="/" element={<Protected><Layout /></Protected>}>
            <Route index element={<Week />} />
            <Route path="monthly" element={<Monthly />} />
            <Route path="goals" element={<Goals />} />
            <Route path="calendar" element={<CalendarPage />} />
          </Route>
        </Routes>
        <Toaster />
      </AuthProvider>
    </HashRouter>
  );
}
