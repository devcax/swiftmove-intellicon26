export interface PageMeta {
  title: string;
  subtitle: string;
}

export function pageMetaFor(pathname: string, today: string): PageMeta {
  if (pathname === "/" || pathname === "/dashboard") {
    return {
      title: "Operations Overview",
      subtitle: today ? `${today} · live feed from the WhatsApp bot` : "live feed from the WhatsApp bot",
    };
  }
  if (pathname.startsWith("/jobs/live")) {
    return {
      title: "Live Job Tracking",
      subtitle: "",
    };
  }
  if (pathname.startsWith("/jobs")) {
    if (pathname === "/jobs/new") return { title: "Create Job", subtitle: "Route, schedule, cargo, and publication" };
    if (pathname.endsWith("/edit")) return { title: "Edit Job", subtitle: "Update a draft or published job" };
    return {
      title: "Job Management & Publication",
      subtitle: "",
    };
  }
  if (pathname.startsWith("/requests")) {
    return { title: "Driver Request Queue", subtitle: "" };
  }
  if (pathname.startsWith("/conversations")) {
    return { title: "Driver Chats", subtitle: "" };
  }
  if (pathname.startsWith("/incidents")) {
    return { title: "Incident Center", subtitle: "" };
  }
  if (pathname.startsWith("/drivers")) {
    if (pathname === "/drivers/new") return { title: "Add Driver", subtitle: "Contact details and vehicle registration" };
    if (pathname.endsWith("/edit")) return { title: "Edit Driver", subtitle: "Contact, vehicle, and bot access" };
    if (pathname !== "/drivers") return { title: "Driver Profile", subtitle: "" };
    return { title: "Driver Registry", subtitle: "" };
  }
  if (pathname === "/policies/new") {
    return { title: "Create an Operational Rule", subtitle: "Choose AI assistance or build a rule manually" };
  }
  if (pathname.startsWith("/policies")) {
    if (pathname.endsWith("/edit")) return { title: "Edit Operational Rule", subtitle: "Edit requirements, save a draft, then publish" };
    return { title: "Operational Rules", subtitle: "what the bot, the dashboard and the timers allow on every job" };
  }
  if (pathname.startsWith("/flows")) {
    return { title: "Bot Conversations", subtitle: "what the bot says to drivers, and when" };
  }
  if (pathname.startsWith("/advanced")) {
    if (pathname.endsWith("/edit")) return { title: "Edit AI Instruction", subtitle: "Advanced admin area" };
    return { title: "Advanced · AI Instructions", subtitle: "technical prompts — admin area" };
  }
  return { title: "SwiftMove", subtitle: "" };
}
