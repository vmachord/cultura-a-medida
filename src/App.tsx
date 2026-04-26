import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layouts/AppLayout";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Discover from "./pages/Discover";
import ForYou from "./pages/ForYou";
import FacilityDetail from "./pages/FacilityDetail";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminHeatmap from "./pages/admin/AdminHeatmap";
import AdminGaps from "./pages/admin/AdminGaps";
import AdminInsights from "./pages/admin/AdminInsights";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />

            {/* Citizen area */}
            <Route path="/app/onboarding" element={<ProtectedRoute requireRole="citizen"><Onboarding /></ProtectedRoute>} />
            <Route element={<ProtectedRoute requireRole="citizen" requireOnboarding><AppLayout /></ProtectedRoute>}>
              <Route path="/app/discover" element={<Discover />} />
              <Route path="/app/for-you" element={<ForYou />} />
              <Route path="/app/place/:id" element={<FacilityDetail />} />
              <Route path="/app/profile" element={<Profile />} />
            </Route>

            {/* Admin area */}
            <Route element={<ProtectedRoute requireRole="admin"><AdminLayout /></ProtectedRoute>}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/heatmap" element={<AdminHeatmap />} />
              <Route path="/admin/gaps" element={<AdminGaps />} />
              <Route path="/admin/insights" element={<AdminInsights />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
