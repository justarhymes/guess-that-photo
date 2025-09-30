import { useDrop } from "react-dnd";
import DraggablePhoto from "./DraggablePhoto.jsx";

export default function GuessTarget({
  user,
  assignedPhotos,
  onDropPhoto,
  disabled,
  hasCompletedGuesses = false,
}) {
  const [{ isOver, canDrop }, dropRef] = useDrop(
    () => ({
      accept: "PHOTO_CARD",
      canDrop: () => !disabled,
      drop: (item) => {
        if (!disabled) {
          onDropPhoto(item.id, user.id);
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [user, disabled, onDropPhoto]
  );

  const classes = () => {
    let base =
      "flex flex-col gap-3 rounded-2xl bg-white/5 p-4 text-white backdrop-blur transition outline-none";
    if (isOver && canDrop) {
      base += " border-2 border-rose-500";
    } else {
      base += " border-2 border-transparent";
    }
    if (disabled) {
      base += " opacity-50 cursor-not-allowed";
    } else {
      base += " text-white";
    }

    return base;
  };

  return (
    <div ref={dropRef} className={classes()}>
      <div className='flex items-center gap-3'>
        <img
          src={
            user.photoURL ||
            `https://api.dicebear.com/7.x/croodles/svg?seed=${
              user.avatarSeed || user.id
            }&size=180`
          }
          alt={user.name}
          className='h-24 w-24 rounded-full object-cover'
        />
        <div className='flex flex-col gap-1'>
          <div className='flex items-center gap-2 text-sm font-semibold'>
            <span>{user.name}</span>
            {hasCompletedGuesses && (
              <span className='inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white'>
                ✓
              </span>
            )}
          </div>
          {user.ready && (
            <div className='inline-flex items-center justify-center px-3 py-1 text-xs font-semibold'>
              Ready
            </div>
          )}
        </div>
      </div>
      {assignedPhotos.length > 0 && (
        <div className='grid grid-cols-5 gap-2'>
          {assignedPhotos.map((photo) => (
            <div key={photo.id}>
              <DraggablePhoto photo={photo} disabled={disabled} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
