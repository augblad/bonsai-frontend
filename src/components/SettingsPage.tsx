import { useEffect, useState } from "react";
import { useTheme } from "@/lib/theme";
import { Sun, Moon, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { settingsGet, settingsSet } from "@/lib/api";

export function SettingsPage() {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [branchColors, setBranchColors] = useState(false);
  const [minimapEnabled, setMinimapEnabled] = useState(false);
  const [defaultDebounceMs, setDefaultDebounceMs] = useState(10000);
  const [milestoneTemplate, setMilestoneTemplate] = useState("");
  const [canvasDirection, setCanvasDirection] = useState<"horizontal" | "vertical">("horizontal");

  useEffect(() => {
    settingsGet("branchColorsEnabled").then((val) => {
      if (typeof val === "boolean") setBranchColors(val);
    });
    settingsGet("minimapEnabled").then((val) => {
      if (typeof val === "boolean") setMinimapEnabled(val);
    });
    settingsGet("autoWatchDebounceMs").then((val) => {
      if (typeof val === "number") setDefaultDebounceMs(val);
    });
    settingsGet("milestoneNameTemplate").then((val) => {
      if (typeof val === "string") setMilestoneTemplate(val);
    });
    settingsGet("canvasDirection").then((val) => {
      if (val === "horizontal" || val === "vertical") setCanvasDirection(val);
    });
  }, []);

  const handleBranchColorsToggle = async (checked: boolean) => {
    setBranchColors(checked);
    await settingsSet("branchColorsEnabled", checked);
  };

  const handleMinimapToggle = async (checked: boolean) => {
    setMinimapEnabled(checked);
    await settingsSet("minimapEnabled", checked);
  };

  const handleDebounceChange = async (value: string) => {
    const ms = Number(value);
    setDefaultDebounceMs(ms);
    await settingsSet("autoWatchDebounceMs", ms);
  };

  const handleTemplateChange = async (value: string) => {
    setMilestoneTemplate(value);
    await settingsSet("milestoneNameTemplate", value);
  };

  const handleCanvasDirectionChange = async (value: string) => {
    const dir = value as "horizontal" | "vertical";
    setCanvasDirection(dir);
    await settingsSet("canvasDirection", dir);
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

        {/* Minimap */}
        <div className="flex items-center justify-between py-3 border-b border-border">
          <div>
            <Label className="text-sm font-medium">Minimap</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Show minimap overview on the timeline canvas</p>
          </div>
          <Switch checked={minimapEnabled} onCheckedChange={handleMinimapToggle} />
        </div>

        {/* Default auto-watch debounce */}
        <div className="flex items-center justify-between py-3 border-b border-border">
          <div>
            <Label className="text-sm font-medium">Auto-watch debounce</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Default wait time before auto-saving after changes</p>
          </div>
          <Select value={String(defaultDebounceMs)} onValueChange={handleDebounceChange}>
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5000">5s</SelectItem>
              <SelectItem value="10000">10s</SelectItem>
              <SelectItem value="30000">30s</SelectItem>
              <SelectItem value="60000">1 min</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Default milestone name template */}
        <div className="flex items-center justify-between py-3 border-b border-border">
          <div className="flex-1 mr-4">
            <Label className="text-sm font-medium">Milestone name template</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Default name for new milestones. Use <code className="text-[10px] bg-accent px-1 rounded">{"{{n}}"}</code> for count and <code className="text-[10px] bg-accent px-1 rounded">{"{{date}}"}</code> for date.
            </p>
          </div>
          <Input
            className="w-44 h-8 text-xs"
            placeholder="e.g. Checkpoint {{n}}"
            value={milestoneTemplate}
            onChange={(e) => handleTemplateChange(e.target.value)}
          />
        </div>

        {/* Canvas layout direction */}
        <div className="flex items-center justify-between py-3 border-b border-border">
          <div>
            <Label className="text-sm font-medium">Canvas layout direction</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Direction of the milestone tree on the canvas</p>
          </div>
          <Select value={canvasDirection} onValueChange={handleCanvasDirectionChange}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="horizontal">Left → Right</SelectItem>
              <SelectItem value="vertical">Top → Down</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
