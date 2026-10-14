import * as React from "react";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import ListAltOutlinedIcon from "@mui/icons-material/ListAltOutlined";
import SensorsRoundedIcon from "@mui/icons-material/SensorsRounded";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import PlaylistAddCheckRoundedIcon from "@mui/icons-material/PlaylistAddCheckRounded";
import PolicyRoundedIcon from "@mui/icons-material/PolicyRounded";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";

export interface NavChild {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badgeKey?: keyof SidebarBadgeCounts;
  children?: NavChild[];
}

export interface SidebarBadgeCounts {
  jobs: number;
  conversations: number;
  incidents: number;
  requests: number;
}

export const navItems: NavItem[] = [
  { label: "Operations", href: "/", icon: <GridViewRoundedIcon sx={{ fontSize: 22 }} /> },
  {
    label: "Jobs",
    href: "/jobs",
    icon: <Inventory2OutlinedIcon sx={{ fontSize: 22 }} />,
    badgeKey: "jobs",
    children: [
      { label: "Manage Jobs", href: "/jobs", icon: <ListAltOutlinedIcon sx={{ fontSize: 16 }} /> },
      { label: "Live", href: "/jobs/live", icon: <SensorsRoundedIcon sx={{ fontSize: 16 }} /> },
    ],
  },
  { label: "Requests", href: "/requests", icon: <PlaylistAddCheckRoundedIcon sx={{ fontSize: 22 }} />, badgeKey: "requests" },
  { label: "Driver Chats", href: "/conversations", icon: <ChatBubbleOutlineRoundedIcon sx={{ fontSize: 22 }} />, badgeKey: "conversations" },
  { label: "Incidents", href: "/incidents", icon: <ReportProblemOutlinedIcon sx={{ fontSize: 22 }} />, badgeKey: "incidents" },
  { label: "Drivers", href: "/drivers", icon: <PeopleAltOutlinedIcon sx={{ fontSize: 22 }} /> },
  { label: "Policies", href: "/policies", icon: <PolicyRoundedIcon sx={{ fontSize: 22 }} /> },
  { label: "Bot Conversations", href: "/flows", icon: <AccountTreeRoundedIcon sx={{ fontSize: 22 }} /> },
  { label: "Advanced", href: "/advanced", icon: <TuneRoundedIcon sx={{ fontSize: 22 }} /> },
];

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isJobsChildActive(pathname: string, href: string) {
  if (href === "/jobs") {
    return pathname === "/jobs" || (pathname.startsWith("/jobs/") && !pathname.startsWith("/jobs/live"));
  }
  return isActive(pathname, href);
}

export function notificationCount(currentIds: string[], previousIds: string[]) {
  const previous = new Set(previousIds);
  return currentIds.filter((id) => !previous.has(id)).length;
}
