import { useEffect, useState } from "react";
import { useTheme } from "@/lib/theme";
import { Sun, Moon, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { settingsGet, settingsSet } from "@/lib/api";

export function SettingsPage() {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [branchColors, setBranchColors] = useState(false);

  useEffect(() => {
    settingsGet("branchColorsEnabled").then((val) => {
      if (typeof val === "boolean") setBranchColors(val);
    });
  }, []);

  const handleBranchColorsToggle = async (checked: boolean) => {
    setBranchColors(checked);
    await settingsSet("branchColorsEnabled", checked);
  };

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

        {/* Branch colors */}
        <div className="flex items-center justify-between py-3 border-b border-border">
          <div>
            <Label className="text-sm font-medium">Branch colors</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Color-code branches on the timeline canvas</p>
          </div>
          <Switch checked={branchColors} onCheckedChange={handleBranchColorsToggle} />
        </div>
      </div>
    </div>
  );
}
