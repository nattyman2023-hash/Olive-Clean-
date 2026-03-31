import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index.tsx";
import BookPage from "./pages/BookPage.tsx";
import AdminLogin from "./pages/AdminLogin.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import About from "./pages/About.tsx";
import FeedbackForm from "./pages/FeedbackForm.tsx";
import ClientLogin from "./pages/ClientLogin.tsx";
import ClientDashboard from "./pages/ClientDashboard.tsx";
import NotFound from "./pages/NotFound.tsx";
import Careers from "./pages/Careers.tsx";
import Questionnaire from "./pages/Questionnaire.tsx";
import EmployeeLogin from "./pages/EmployeeLogin.tsx";
import EmployeeDashboard from "./pages/EmployeeDashboard.tsx";
import ServiceDetail from "./pages/ServiceDetail.tsx";
import AreaDetail from "./pages/AreaDetail.tsx";
import Terms from "./pages/Terms.tsx";
import Privacy from "./pages/Privacy.tsx";
import Unsubscribe from "./pages/Unsubscribe.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/book" element={<BookPage />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/about" element={<About />} />
            <Route path="/feedback/:jobId" element={<FeedbackForm />} />
            <Route path="/client/login" element={<ClientLogin />} />
            <Route path="/client" element={<ClientDashboard />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/questionnaire/:clientId" element={<Questionnaire />} />
            <Route path="/employee/login" element={<EmployeeLogin />} />
            <Route path="/employee" element={<EmployeeDashboard />} />
            <Route path="/services/:slug" element={<ServiceDetail />} />
            <Route path="/areas/:slug" element={<AreaDetail />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
