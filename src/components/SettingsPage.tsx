import { useTheme } from "@/lib/theme";
import { Sun, Moon, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export function SettingsPage() {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [defaultDir, setDefaultDir] = useState("/Users/dev/projects");
  const [trayMode, setTrayMode] = useState(false);

  return (
    <div className="p-8 max-w-lg">
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft size={16} strokeWidth={1.5} />
        Back
      </button>
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Theme */}
        <div className="flex items-center justify-between py-3 border-b border-border">
          <div>
            <Label className="text-sm font-medium">Appearance</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Switch between dark and light mode</p>
          </div>
          <button
            onClick={toggle}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-accent text-foreground hover:bg-accent/80 transition-colors"
          >
            {theme === "dark" ? <IconSun size={18} stroke={1.5} /> : <IconMoon size={18} stroke={1.5} />}
          </button>
        </div>

        {/* Default dir */}
        <div className="py-3 border-b border-border space-y-2">
          <Label className="text-sm font-medium">Default Save Directory</Label>
          <Input
            value={defaultDir}
            onChange={(e) => setDefaultDir(e.target.value)}
            className="font-mono text-sm"
          />
        </div>

        {/* Tray */}
        <div className="flex items-center justify-between py-3 border-b border-border">
          <div>
            <Label className="text-sm font-medium">Launch quietly in System Tray</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Start Bonsai minimized to the system tray</p>
          </div>
          <Switch checked={trayMode} onCheckedChange={setTrayMode} />
        </div>
      </div>
    </div>
  );
}
