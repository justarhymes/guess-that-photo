import { useDrag } from "react-dnd";

export default function DraggablePhoto({ photo, disabled }) {
  const [{ isDragging }, dragRef] = useDrag(
    () => ({
      type: "PHOTO_CARD",
      item: { id: photo.id },
      canDrag: !disabled,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [photo, disabled]
  );

  const classes = () => {
    let base = "shadow overflow-hidden h-auto";
    if (disabled) {
      base += " cursor-not-allowed";
    } else {
      base += " cursor-grab";
    }
    if (isDragging) {
      base += " opacity-40";
    } else {
      base += " opacity-100";
    }

    return base;
  };

  return (
    <div ref={dragRef} className={classes()}>
      <img src={photo.url} alt='Uploaded' className='block w-full h-auto' />
    </div>
  );
}
