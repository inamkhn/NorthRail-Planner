import { Icon } from "@/components/ui/Icon";

interface PublicPointPopupProps {
  label: string;
  notes?: string;
  photos?: string[];
  onClose: () => void;
}

export function PublicPointPopup({ label, notes, photos, onClose }: PublicPointPopupProps) {
  return (
    <div className="w-[280px] sm:w-80 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-zinc-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <Icon name="marker" className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-900">{label}</h3>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {notes ? (
          <p className="text-sm leading-relaxed text-zinc-600">{notes}</p>
        ) : (
          <p className="text-sm italic text-zinc-400">No notes provided.</p>
        )}

        {/* Photos Grid/Scroll */}
        {photos && photos.length > 0 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {photos.map((photo, i) => (
              <img
                key={i}
                src={photo}
                alt={`Point photo ${i + 1}`}
                className="h-20 w-28 shrink-0 rounded-lg object-cover shadow-sm ring-1 ring-zinc-200"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
