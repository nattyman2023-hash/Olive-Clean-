import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ImpersonationBar from "@/components/admin/ImpersonationBar";
import ScrollToTop from "@/components/layout/ScrollToTop";
import ChatWidget from "@/components/chat/ChatWidget";
import ErrorBoundary from "@/components/ErrorBoundary";
import PageLoader from "@/components/PageLoader";
import SmartRedirect from "@/components/SmartRedirect";
import React, { Suspense } from "react";

// Lazy-load all page components for code-splitting
const Index = React.lazy(() => import("./pages/Index.tsx"));
const BookPage = React.lazy(() => import("./pages/BookPage.tsx"));
const AdminLogin = React.lazy(() => import("./pages/AdminLogin.tsx"));
const AdminDashboard = React.lazy(() => import("./pages/AdminDashboard.tsx"));
const ResetPassword = React.lazy(() => import("./pages/ResetPassword.tsx"));
const About = React.lazy(() => import("./pages/About.tsx"));
const FeedbackForm = React.lazy(() => import("./pages/FeedbackForm.tsx"));
const ClientLogin = React.lazy(() => import("./pages/ClientLogin.tsx"));
const ClientDashboard = React.lazy(() => import("./pages/ClientDashboard.tsx"));
const NotFound = React.lazy(() => import("./pages/NotFound.tsx"));
const Careers = React.lazy(() => import("./pages/Careers.tsx"));
const Questionnaire = React.lazy(() => import("./pages/Questionnaire.tsx"));
const EmployeeLogin = React.lazy(() => import("./pages/EmployeeLogin.tsx"));
const EmployeeDashboard = React.lazy(() => import("./pages/EmployeeDashboard.tsx"));
const ServiceDetail = React.lazy(() => import("./pages/ServiceDetail.tsx"));
const AreaDetail = React.lazy(() => import("./pages/AreaDetail.tsx"));
const Terms = React.lazy(() => import("./pages/Terms.tsx"));
const Privacy = React.lazy(() => import("./pages/Privacy.tsx"));
const Unsubscribe = React.lazy(() => import("./pages/Unsubscribe.tsx"));
const WhyUs = React.lazy(() => import("./pages/WhyUs.tsx"));
const PerksPage = React.lazy(() => import("./pages/PerksPage.tsx"));
const Team = React.lazy(() => import("./pages/Team.tsx"));

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <SmartRedirect />
          <ImpersonationBar />
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
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
                <Route path="/why-us" element={<WhyUs />} />
                <Route path="/perks" element={<PerksPage />} />
                <Route path="/team" element={<Team />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
          <ChatWidget />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
