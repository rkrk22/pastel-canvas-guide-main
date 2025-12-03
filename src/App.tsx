import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthPage } from "./components/auth/AuthPage";
import { AuthProvider } from "./components/auth/AuthProvider";
import { AppShell } from "./components/app/AppShell";
import { PrivateLayout } from "./components/layouts/PrivateLayout";
import { InstantReaderLayout } from "./components/layouts/InstantReaderLayout";
import AppHome from "./pages/AppHome";
import ReadersPage from "./pages/ReadersPage";
import AccountPage from "./pages/AccountPage";
import ChapterView from "./pages/ChapterView";
import PageView from "./pages/PageView";
import NotFound from "./pages/NotFound";
import { XpProvider } from "./components/app/XpProvider";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <XpProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Navigate to="/app" replace />} />
                <Route path="/readers" element={<Navigate to="/app/readers" replace />} />
                <Route path="/account" element={<Navigate to="/app/account" replace />} />

                <Route element={<InstantReaderLayout />}>
                  <Route path="/read/:slug" element={<PageView />} />
                  <Route
                    path="/read/chapters/:chapterSlug/pages/:pageSlug"
                    element={<PageView />}
                  />
                </Route>

                <Route path="/auth" element={<AuthPage />} />

                <Route path="/app" element={<PrivateLayout />}>
                  <Route element={<AppShell />}>
                    <Route index element={<AppHome />} />
                    <Route path="readers" element={<ReadersPage />} />
                    <Route path="account" element={<AccountPage />} />
                    <Route path="chapters/:chapterSlug" element={<ChapterView />} />
                  </Route>
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </XpProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
