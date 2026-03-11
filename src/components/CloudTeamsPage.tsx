import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  FolderKanban,
  Crown,
  Shield,
  User,
  Plus,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  cloudListTeams,
  cloudLogout,
  type CloudTeam,
  type CloudUser,
} from "@/lib/cloud-api";

const roleIcon = {
  OWNER: Crown,
  ADMIN: Shield,
  MEMBER: User,
};

const roleLabel = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
};

export function CloudTeamsPage({
  user,
  onLoggedOut,
}: {
  user: CloudUser;
  onLoggedOut: () => void;
}) {
  const navigate = useNavigate();

  const [teams, setTeams] = useState<CloudTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create team modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  const fetchTeams = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await cloudListTeams();
      setTeams(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load teams");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleCreateTeam = async () => {
    if (!createName.trim()) {
      toast.error("Enter a team name");
      return;
    }
    setCreateLoading(true);
    try {
      const { cloudCreateTeam } = await import("@/lib/cloud-api");
      await cloudCreateTeam(createName.trim(), createDesc.trim() || undefined);
      toast.success("Team created");
      setCreateOpen(false);
      setCreateName("");
      setCreateDesc("");
      fetchTeams(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create team");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleLogout = async () => {
    await cloudLogout();
    onLoggedOut();
    toast.success("Logged out");
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Your Teams</h1>
              <p className="text-xs text-muted-foreground">
                Logged in as {user.displayName} ({user.email})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchTeams(false)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Team
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : teams.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <h2 className="text-lg font-medium">No teams yet</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Create a team or accept an invite to get started
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => {
              const RoleIcon = roleIcon[team.role];
              return (
                <button
                  key={team.id}
                  onClick={() => navigate(`/cloud/team/${team.id}`)}
                  className="text-left rounded-xl border border-border bg-card p-5 hover:bg-accent transition-colors group"
                >
                  {/* Team avatar */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm shrink-0">
                      {team.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                        {team.name}
                      </h3>
                      {team.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {team.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {team.memberCount} member{team.memberCount !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <FolderKanban className="h-3.5 w-3.5" />
                      {team.projectCount} project{team.projectCount !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1 ml-auto">
                      <RoleIcon className="h-3.5 w-3.5" />
                      {roleLabel[team.role]}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Team Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="team-name" className="text-xs">Team Name</Label>
              <Input
                id="team-name"
                placeholder="My Team"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="team-desc" className="text-xs">Description (optional)</Label>
              <Input
                id="team-desc"
                placeholder="What's this team for?"
                value={createDesc}
                onChange={(e) => setCreateDesc(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTeam} disabled={createLoading}>
              {createLoading ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
