import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Plus, Settings, Info } from "lucide-react";
import { IconLeafFilled } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const navItems = [
  { icon: Home, label: "Dashboard", path: "/" },
];

export function AppSidebar({ onNewProject }: { onNewProject: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="flex flex-col items-center w-14 min-h-screen border-r border-border bg-card pt-2 pb-4 gap-2">
      {/* Drag region — macOS only (hiddenInset titlebar) */}
      {window.electronAPI.platform === 'darwin' && (
        <div className="w-full h-6 shrink-0" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />
      )}
      {/* Logo */}
      <div className="mb-2 flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground font-bold text-sm select-none">
        <IconLeafFilled size={22} strokeWidth={1.5} />
      </div>

      {/* Nav */}
      {navItems.map((item) => (
        <Tooltip key={item.path}>
          <TooltipTrigger asChild>
            <button
              onClick={() => navigate(item.path)}
              className={cn(
                "w-9 h-9 flex items-center justify-center rounded-lg transition-colors",
                location.pathname === item.path
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon size={20} strokeWidth={1.5} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      ))}

      {/* New Project */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onNewProject}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Plus size={20} strokeWidth={1.5} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">New Project</TooltipContent>
      </Tooltip>

      <div className="flex-1" />

      {/* About */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => navigate("/about")}
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-lg transition-colors",
              location.pathname === "/about"
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Info size={20} strokeWidth={1.5} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">About</TooltipContent>
      </Tooltip>

      {/* Settings */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => navigate("/settings")}
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-lg transition-colors",
              location.pathname === "/settings"
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Settings size={20} strokeWidth={1.5} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Settings</TooltipContent>
      </Tooltip>
    </aside>
  );
}
