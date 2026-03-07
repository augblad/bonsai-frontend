import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const navItems = [
  { icon: Home, label: "Dashboard", path: "/" },
];

export function AppSidebar({ onNewProject }: { onNewProject: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="flex flex-col items-center w-14 min-h-screen border-r border-border bg-card py-4 gap-2">
      {/* Logo */}
      <div className="mb-4 flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground font-bold text-sm select-none">
        B
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
              <item.icon size={20} stroke={1.5} />
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
            <IconPlus size={20} stroke={1.5} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">New Project</TooltipContent>
      </Tooltip>

      <div className="flex-1" />

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
            <IconSettings size={20} stroke={1.5} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Settings</TooltipContent>
      </Tooltip>
    </aside>
  );
}
