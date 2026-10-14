import { isActive, navItems } from "./nav";
import { pageMetaFor } from "./pageMeta";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/** Resolve route hierarchy from the same navigation labels used by the sidebar. */
export function breadcrumbsFor(pathname: string): BreadcrumbItem[] {
  const home = { label: "Operations", href: "/" };
  if (pathname === "/" || pathname === "/dashboard") {
    return [home, { label: "Overview" }];
  }

  const section = navItems.find((item) => item.href !== "/" && isActive(pathname, item.href));
  if (!section) return [home, { label: pageMetaFor(pathname, "").title }];

  if (pathname === section.href) return [home, { label: section.label }];

  const child = section.children?.find((item) => item.href === pathname);
  const label = child?.label
    ?? (section.href === "/jobs" && pathname !== "/jobs/new" && !pathname.endsWith("/edit") ? "Job details" : pageMetaFor(pathname, "").title);

  return [home, { label: section.label, href: section.href }, { label }];
}
