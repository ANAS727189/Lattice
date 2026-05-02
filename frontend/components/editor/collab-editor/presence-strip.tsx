import type { UserPresence } from "@/types";
import { initials } from "@/components/editor/collab-editor/cursor";

export function PresenceStrip({ users }: { users: UserPresence[] }) {
  const visibleUsers = users.slice(0, 4);
  const extraCount = Math.max(0, users.length - visibleUsers.length);

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-1.5">
        {visibleUsers.map((user) => (
          <div
            key={user.id}
            title={user.name}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold text-white"
            style={{
              backgroundColor: user.color,
              border: "2px solid var(--surface)",
            }}
          >
            {initials(user.name)}
          </div>
        ))}
        {extraCount > 0 && (
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold"
            style={{
              background: "var(--ink)",
              color: "var(--cream)",
              border: "2px solid var(--surface)",
            }}
          >
            +{extraCount}
          </div>
        )}
      </div>
      {users.length > 0 && (
        <span
          className="hidden text-xs lg:inline"
          style={{ color: "var(--ink-faint)" }}
        >
          {users.length} live
        </span>
      )}
    </div>
  );
}
