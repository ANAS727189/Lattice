import type { UserPresence } from "@/types";

export function buildCursor(user: UserPresence) {
  const cursor = document.createElement("span");
  cursor.className = "lattice-cursor";
  cursor.style.borderColor = user.color;

  const label = document.createElement("span");
  label.className = "lattice-cursor-label";
  label.style.backgroundColor = user.color;
  label.textContent = user.name;
  cursor.appendChild(label);

  return cursor;
}

export function presenceColor(seed: string) {
  const colors = [
    "#1A6B3A",
    "#C4501A",
    "#1A4A8C",
    "#6B3A1A",
    "#1A6B6B",
    "#8C1A1A",
    "#3A1A6B",
    "#4A6B1A",
  ];
  const total = Array.from(seed).reduce(
    (sum, character) => sum + character.charCodeAt(0),
    0
  );
  return colors[total % colors.length];
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
