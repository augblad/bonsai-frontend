import { useNavigate } from "react-router-dom";
import { ArrowLeft, GitBranch, Layers, Clock, Tag, Zap, Archive } from "lucide-react";
import { IconBrandGithub, IconLeafFilled } from "@tabler/icons-react";

const creators = [
  { name: "Kelvin Brahe", github: "K3lvin4SY" },
  { name: "Gabriel Svärdström", github: "Gabbes72" },
  { name: "August Thyblad", github: "augblad" },
  { name: "Hjalmar Rutberg", github: "HjalmarRutberg" },
];

const features = [
  {
    icon: GitBranch,
    title: "Timelines",
    description: "Branch your work into parallel creative directions — all history stays intact.",
  },
  {
    icon: Layers,
    title: "Milestones",
    description: "Save snapshots of your project at any point. No git knowledge required.",
  },
  {
    icon: Clock,
    title: "Time Travel",
    description: "Restore any past milestone instantly. Unsaved changes are detected before restoring.",
  },
  {
    icon: Tag,
    title: "Tags",
    description: "Color-code milestones with custom tags to organise your history visually.",
  },
  {
    icon: Zap,
    title: "Auto-Watch",
    description: "Bonsai monitors your folder and auto-saves milestones when files change.",
  },
  {
    icon: Archive,
    title: "Export",
    description: "Export any milestone's full file state as a ZIP archive at any time.",
  },
];

export function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-full max-w-3xl mx-auto w-full">
      {/* Sticky header */}
      <div className="sticky top-0 bg-background z-10 pt-8 px-8 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ArrowLeft size={18} strokeWidth={1.5} />
        </button>
        <h1 className="text-xl font-semibold">About</h1>
      </div>

      <div className="px-8 pb-8">
      {/* App identity */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 flex items-center justify-center rounded-xl bg-primary text-primary-foreground shrink-0">
          <IconLeafFilled size={32} strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Bonsai</h2>
          <p className="text-sm text-muted-foreground">
            The safety net for creative workflows — minus the developer complexity.
          </p>
        </div>
      </div>

      {/* What is Bonsai */}
      <section className="mb-8">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Bonsai is a desktop version-control tool designed for designers, illustrators, 3D artists,
          and game developers. It lets you save snapshots of large binary files — Photoshop documents,
          Blender scenes, Minecraft worlds — store only the differences between versions using binary
          patches, and navigate your history through an interactive visual canvas. No Git vocabulary,
          no terminal, no complexity.
        </p>
      </section>

      {/* How to use */}
      <section className="mb-8">
        <h3 className="text-base font-semibold mb-4">How to use</h3>
        <ol className="space-y-3 text-sm text-muted-foreground list-none">
          {[
            { step: "1", text: "Click the + icon in the sidebar to create a new project and point Bonsai at your project folder." },
            { step: "2", text: "Press Ctrl+M (or Cmd+M on macOS) on the canvas to save a Milestone whenever you reach a state worth keeping." },
            { step: "3", text: "Click any Milestone node to see its details — rename it, add a description, attach color-coded tags, or restore your files to that exact state." },
            { step: "4", text: "Restore an older Milestone and then save a new one to branch the Timeline — a new parallel history starts from that point." },
            { step: "5", text: "Enable Auto-Watch in Project Settings to let Bonsai save Milestones automatically when files change." },
            { step: "6", text: "Press Ctrl+H / Cmd+H on the canvas to see the full keyboard shortcut reference." },
          ].map(({ step, text }) => (
            <li key={step} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent text-foreground flex items-center justify-center text-xs font-semibold">
                {step}
              </span>
              <span className="leading-relaxed pt-0.5">{text}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Features grid */}
      <section className="mb-8">
        <h3 className="text-base font-semibold mb-4">Key features</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="flex gap-3 p-3 rounded-lg border border-border bg-card"
            >
              <Icon size={18} strokeWidth={1.5} className="text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium leading-none mb-1">{title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Creators */}
      <section>
        <h3 className="text-base font-semibold mb-4">Created by</h3>
        <div className="flex flex-col gap-2">
          {creators.map(({ name, github }) => (
            <a
              key={github}
              href={`https://github.com/${github}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent transition-colors group"
            >
              <IconBrandGithub size={18} strokeWidth={1.5} className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              <span className="text-sm font-medium">{name}</span>
              <span className="text-xs text-muted-foreground ml-auto">@{github}</span>
            </a>
          ))}
        </div>
      </section>
      </div>
    </div>
  );
}
