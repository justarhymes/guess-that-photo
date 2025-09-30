export default function PhotoGallery({ title, photos, onRemove, canRemove }) {
  const allowRemoval =
    typeof onRemove === "function" && typeof canRemove === "function";

  return (
    <div className='flex flex-col gap-3'>
      {title && <div className='text-lg font-dynapuff text-white'>{title}</div>}
      {photos.length === 0 ? (
        <div className='rounded-2xl bg-white/5 px-4 py-6 text-center text-sm text-white/70'>
          No photos yet.
        </div>
      ) : (
        <div className='grid gap-3 grid-cols-[repeat(auto-fill,minmax(140px,200px))] justify-start'>
          {photos.map((photo) => {
            const removable = allowRemoval && canRemove(photo);
            return (
              <div
                key={photo.id}
                className='relative aspect-square overflow-hidden bg-white/10 shadow-md'>
                <img
                  src={photo.url}
                  alt={photo.title || "Uploaded photo"}
                  className='h-full w-full object-cover'
                />
                {removable && (
                  <button
                    type='button'
                    onClick={() => onRemove(photo)}
                    className='absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/90 text-sm font-semibold text-white shadow-lg transition hover:bg-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-white'
                    aria-label='Remove photo'>
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
