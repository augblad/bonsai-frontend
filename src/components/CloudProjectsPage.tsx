import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  FolderKanban,
  GitBranch,
  RefreshCw,
  Users,
  Crown,
  Shield,
  User,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  cloudListProjects,
  cloudGetTeam,
  type CloudProject,
  type CloudTeamDetail,
} from "@/lib/cloud-api";

const roleIcon = { OWNER: Crown, ADMIN: Shield, MEMBER: User };

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function CloudProjectsPage() {
  const navigate = useNavigate();
  const { teamId } = useParams<{ teamId: string }>();

  const [team, setTeam] = useState<CloudTeamDetail | null>(null);
  const [projects, setProjects] = useState<CloudProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (showSpinner = true) => {
    if (!teamId) return;
    if (showSpinner) setLoading(true);
    else setRefreshing(true);
    try {
      const [t, p] = await Promise.all([
        cloudGetTeam(teamId),
        cloudListProjects(teamId),
      ]);
      setTeam(t);
      setProjects(p);
    } catch (err: any) {
      toast.error(err.message || "Failed to load team data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [teamId]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-6 py-4 border-b border-border">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32 mt-2" />
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/cloud")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{team?.name ?? "Team"}</h1>
              <p className="text-xs text-muted-foreground">
                {projects.length} project{projects.length !== 1 ? "s" : ""} · {team?.members.length ?? 0} member{(team?.members.length ?? 0) !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(false)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Members strip */}
        {team && team.members.length > 0 && (
          <div className="flex items-center gap-1 mt-3 flex-wrap">
            {team.members.map((m) => {
              const RIcon = roleIcon[m.role as keyof typeof roleIcon] || User;
              return (
                <Tooltip key={m.userId}>
                  <TooltipTrigger asChild>
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground border border-border cursor-default">
                      {m.user.displayName.charAt(0).toUpperCase()}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="flex items-center gap-1.5">
                    <RIcon className="h-3 w-3" />
                    {m.user.displayName}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        )}
      </div>

      {/* Projects grid */}
      <div className="flex-1 overflow-auto p-6">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <FolderKanban className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <h2 className="text-lg font-medium">No projects yet</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Projects created on the web dashboard will appear here
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="rounded-xl border border-border bg-card p-5 hover:bg-accent transition-colors group"
              >
                {/* Project header */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm shrink-0">
                    {project.icon
                      ? <img src={project.icon} alt="" className="w-6 h-6 rounded" />
                      : project.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                      {project.name}
                    </h3>
                    {project.isPublic && (
                      <Badge variant="secondary" className="text-[10px] mt-1">
                        Public
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <GitBranch className="h-3.5 w-3.5" />
                    {project.milestoneCount} milestone{project.milestoneCount !== 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1 ml-auto">
                    <Clock className="h-3.5 w-3.5" />
                    {timeAgo(project.updatedAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
