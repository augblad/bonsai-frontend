import { useTheme } from "@/lib/theme";
import { Sun, Moon, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { openDirectory } from "@/lib/api";
import { Button } from "@/components/ui/button";

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
            {theme === "dark" ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
          </button>
        </div>

        {/* Default dir */}
        <div className="py-3 border-b border-border space-y-2">
          <Label className="text-sm font-medium">Default Save Directory</Label>
          <div className="flex gap-2">
            <Input
              value={defaultDir}
              onChange={(e) => setDefaultDir(e.target.value)}
              className="flex-1 font-mono text-sm"
            />
            <Button variant="outline" size="sm" onClick={async () => {
              const result = await openDirectory("Select Default Directory", defaultDir || undefined);
              if (!result.canceled && result.path) setDefaultDir(result.path);
            }}>
              Browse
            </Button>
          </div>
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
