export type TopBarProps = {
  title?: string;
};

export function TopBar({ title = "NorthRail Planner" }: TopBarProps) {
  return (
    <header className="flex h-14 items-center border-b border-zinc-200 bg-white px-6">
      <div className="text-base font-semibold text-zinc-900">{title}</div>
    </header>
  );
}
