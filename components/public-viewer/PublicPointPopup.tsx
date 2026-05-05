import { Icon } from "@/components/ui/Icon";

interface PublicPointPopupProps {
  label: string;
  notes?: string;
  photos?: string[];
  onClose: () => void;
}

export function PublicPointPopup({ label, notes, photos, onClose }: PublicPointPopupProps) {
  // Try to parse notes for "TOTAL LENGTH: 12.3 km" or just show it if provided
  return (
    <div className="flex w-80 flex-col gap-4 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <Icon name="route" className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-zinc-900">{label}</h3>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>

      {/* Pink Box */}
      {/* <div className="rounded-xl bg-pink-50 p-3">
        <p className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
          Total Length
        </p>
        <p className="mt-0.5 text-sm font-medium text-zinc-900">
          Unknown (Generated from Route)
        </p>
      </div> */}

      {/* Description */}
      {notes && (
        <p className="text-sm leading-relaxed text-zinc-600">
          {notes}
        </p>
      )}

      {/* Photos */}
      {photos && photos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {photos.map((photo, i) => (
            <img
              key={i}
              src={photo}
              alt={`Point photo ${i + 1}`}
              className="h-16 w-24 flex-none rounded-lg object-cover ring-1 ring-black/5"
            />
          ))}
        </div>
      )}
    </div>
  );
}
