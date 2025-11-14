import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthPage } from "./components/auth/AuthPage";
import { AuthGate } from "./components/AuthGate";
import { AuthProvider } from "./components/auth/AuthProvider";
import { AppShell } from "./components/app/AppShell";
import AppHome from "./pages/AppHome";
import ChapterView from "./pages/ChapterView";
import PageView from "./pages/PageView";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/app" replace />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/app" element={<AuthGate><AppShell /></AuthGate>}>
                <Route index element={<AppHome />} />
                <Route path="chapters/:chapterSlug" element={<ChapterView />} />
                <Route path="chapters/:chapterSlug/pages/:pageSlug" element={<PageView />} />
                <Route path="pages/:slug" element={<PageView />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
