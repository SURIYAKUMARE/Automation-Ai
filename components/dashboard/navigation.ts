import { Activity, BarChart3, CalendarDays, CalendarRange, CircleCheck, Clock3, FilePenLine, History, Images, LayoutGrid, Link2, MessageSquare, Send, Settings2, ShieldCheck, Sparkles, Video } from "lucide-react";

export const workspaceNavigation = [
  { label: "Workspace", links: [
    { label: "Dashboard", url: "/dashboard", icon: LayoutGrid },
    { label: "Create post", url: "/dashboard/create-post", icon: Send },
    { label: "Script Studio", url: "/dashboard/scripts", icon: Video },
    { label: "AI Content Studio", url: "/dashboard/caption-studio", icon: Sparkles },
    { label: "WhatsApp", url: "/dashboard/whatsapp", icon: MessageSquare },
    { label: "Media library", url: "/dashboard/media", icon: Images },
  ] },
  { label: "Publishing", links: [
    { label: "Calendar", url: "/dashboard/calendar", icon: CalendarDays },
    { label: "Scheduled posts", url: "/dashboard/scheduled", icon: CalendarRange },
    { label: "Post queue", url: "/dashboard/queue", icon: Clock3 },
    { label: "Published posts", url: "/dashboard/published", icon: CircleCheck },
    { label: "Drafts", url: "/dashboard/drafts", icon: FilePenLine },
    { label: "Approvals", url: "/dashboard/approvals", icon: ShieldCheck },
    { label: "History", url: "/dashboard/history", icon: History },
  ] },
  { label: "Manage", links: [
    { label: "Social accounts", url: "/dashboard/accounts", icon: Link2 },
    { label: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
    { label: "Automation", url: "/dashboard/automation", icon: Activity },
    { label: "Settings", url: "/dashboard/profile", icon: Settings2 },
  ] },
];

export const workspaceLinks = workspaceNavigation.flatMap((section) => section.links);
