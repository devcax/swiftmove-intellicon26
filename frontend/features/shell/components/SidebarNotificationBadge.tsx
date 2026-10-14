/** The small count bubble next to a sidebar entry. */
export function SidebarNotificationBadge({
  count,
  incident = false,
}: {
  count: number;
  incident?: boolean;
}) {
  if (count === 0) return null;
  return (
    <span
      className={`flex h-[20px] min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white ${
        incident ? "bg-red-600" : "bg-orange-500"
      }`}
      aria-label={`${count} new ${incident ? "incident" : "notification"}${count === 1 ? "" : "s"}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
