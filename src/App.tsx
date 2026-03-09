import { useState, useCallback } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/lib/theme";
import { AppSidebar } from "@/components/AppSidebar";
import { Dashboard } from "@/components/Dashboard";
import { ProjectWorkspace } from "@/components/ProjectWorkspace";
import { SettingsPage } from "@/components/SettingsPage";
import { AboutPage } from "@/components/AboutPage";
import { CreateProjectModal } from "@/components/CreateProjectModal";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [createOpen, setCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreated = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <HashRouter>
            <div className="flex min-h-screen w-full bg-background">
              <AppSidebar onNewProject={() => setCreateOpen(true)} />
              <main className="flex-1 flex flex-col min-h-0">
                {window.electronAPI.platform === 'darwin' && (
                  <div className="h-8 w-full shrink-0" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />
                )}
                <Routes>
                  <Route
                    path="/"
                    element={
                      <Dashboard
                        key={refreshKey}
                        onNewProject={() => setCreateOpen(true)}
                      />
                    }
                  />
                  <Route path="/project/:projectPath" element={<ProjectWorkspace />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
            <CreateProjectModal
              open={createOpen}
              onOpenChange={setCreateOpen}
              onCreated={handleCreated}
            />
          </HashRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
