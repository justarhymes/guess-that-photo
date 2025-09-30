import { useEffect, useMemo, useRef, useState } from "react";
import DraggablePhoto from "./DraggablePhoto.jsx";
import GuessTarget from "./GuessTarget.jsx";
import DragDropProvider from "../dnd/DragDropProvider.jsx";


function calculateAvailableHeight(element, offset = 0) {
  if (!element) return null;
  const parentRect = element.parentElement?.getBoundingClientRect();
  const boundary = parentRect ? parentRect.bottom : window.innerHeight;
  const { top } = element.getBoundingClientRect();
  const available = Math.max(0, boundary - top - offset);
  return Number.isFinite(available) ? available : null;
}

function useAvailableHeight(offset = 0) {
  const ref = useRef(null);
  const [height, setHeight] = useState(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const update = () => {
      const next = calculateAvailableHeight(node, offset);
      setHeight((prev) => (prev === next ? prev : next));
    };

    update();

    const onResize = () => update();
    window.addEventListener("resize", onResize);

    let resizeObserver = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => update());
      resizeObserver.observe(node);
      if (node.parentElement) {
        resizeObserver.observe(node.parentElement);
      }
    }

    return () => {
      window.removeEventListener("resize", onResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [offset]);

  return [ref, height];
}

export default function GuessBoard({
  users,
  photos,
  currentUserId,
  onAssign,
  disabled,
}) {
  const availablePhotos = photos.filter((photo) => {
    if (!photo.guesses || !currentUserId) return true;
    return !photo.guesses[currentUserId];
  });

  const assignments = photos.reduce((acc, photo) => {
    if (!photo.guesses || !currentUserId) return acc;
    const target = photo.guesses[currentUserId];
    if (!target) return acc;
    const list = acc[target] || [];
    list.push(photo);
    acc[target] = list;
    return acc;
  }, {});

  const guessCompletionMap = useMemo(() => {
    const playerList = Array.isArray(users) ? users : [];
    const photoList = Array.isArray(photos) ? photos : [];

    if (playerList.length === 0 || photoList.length === 0) {
      return playerList.reduce((acc, player) => {
        acc[player.id] = false;
        return acc;
      }, {});
    }

    const guessableCounts = playerList.reduce((acc, player) => {
      acc[player.id] = 0;
      return acc;
    }, {});

    const completedCounts = playerList.reduce((acc, player) => {
      acc[player.id] = 0;
      return acc;
    }, {});

    photoList.forEach((photo) => {
      const guesses = photo.guesses || {};
      playerList.forEach((player) => {
        if (photo.uploadedBy === player.id) return;
        guessableCounts[player.id] += 1;
        if (guesses[player.id]) {
          completedCounts[player.id] += 1;
        }
      });
    });

    return playerList.reduce((acc, player) => {
      const total = guessableCounts[player.id];
      acc[player.id] = total > 0 && completedCounts[player.id] >= total;
      return acc;
    }, {});
  }, [photos, users]);

  const [availablePhotosRef, availablePhotosHeight] = useAvailableHeight(24);
  const [targetsRef, targetsHeight] = useAvailableHeight(24);

  const heightStyle = (value) =>
    value != null ? { height: `${value}px`, maxHeight: `${value}px` } : undefined;

  return (
    <DragDropProvider>
      <div className='grid min-h-0 h-full w-full gap-6 overflow-hidden lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]'>
        <div className='flex min-h-0 h-full flex-col overflow-hidden'>
          <div
            ref={availablePhotosRef}
            className='scroll-shadow grid flex-1 min-h-0 gap-3 pr-2 overflow-y-auto'
            style={heightStyle(availablePhotosHeight)}
          >
            {availablePhotos.length === 0 && (
              <div className='text-sm text-white/70'>
                You have assigned all photos. Double check your picks!
              </div>
            )}
            {availablePhotos.map((photo) => (
              <div key={photo.id}>
                <DraggablePhoto photo={photo} disabled={disabled} />
              </div>
            ))}
          </div>
        </div>
        <div
          ref={targetsRef}
          className='scroll-shadow flex min-h-0 h-full flex-col gap-4 pr-2 overflow-y-auto'
          style={heightStyle(targetsHeight)}
        >
          {users.map((user) => (
            <GuessTarget
              key={user.id}
              user={user}
              assignedPhotos={assignments[user.id] || []}
              onDropPhoto={(photoId, targetUserId) =>
                onAssign({ photoId, targetUserId })
              }
              disabled={disabled}
              hasCompletedGuesses={Boolean(guessCompletionMap[user.id])}
            />
          ))}
        </div>
      </div>
    </DragDropProvider>
  );
}