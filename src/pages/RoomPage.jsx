import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import useAuthUser from "../hooks/useAuthUser.js";
import useRoomData from "../hooks/useRoomData.js";
import useRoomActions from "../hooks/useRoomActions.js";
import useCountdown from "../hooks/useCountdown.js";
import {
  Dialog,
  DialogTitle,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import {
  ArrowUpTrayIcon,
  ChatBubbleLeftRightIcon,
  UsersIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import AvatarPicker from "../components/AvatarPicker.jsx";
import PlayerList from "../components/PlayerList.jsx";
import ChatPanel from "../components/ChatPanel.jsx";
import ReadyToggle from "../components/ReadyToggle.jsx";
import PhotoGallery from "../components/PhotoGallery.jsx";
import GuessBoard from "../components/guess/GuessBoard.jsx";

const BASE_STAGE_SECONDS = 120;

function computeStageDurationSeconds(playerCount, perPlayerSeconds = 30) {
  return BASE_STAGE_SECONDS + playerCount * perPlayerSeconds;
}

function getTimestampValue(timestamp) {
  if (!timestamp) return 0;
  if (typeof timestamp.toMillis === "function") {
    return timestamp.toMillis();
  }
  if (typeof timestamp.seconds === "number") {
    const nanos =
      typeof timestamp.nanoseconds === "number" ? timestamp.nanoseconds : 0;
    return timestamp.seconds * 1000 + nanos / 1e6;
  }
  if (typeof timestamp._seconds === "number") {
    const nanos =
      typeof timestamp._nanoseconds === "number" ? timestamp._nanoseconds : 0;
    return timestamp._seconds * 1000 + nanos / 1e6;
  }
  if (timestamp instanceof Date) {
    return timestamp.getTime();
  }
  return 0;
}

const sectionTitleClasses = "text-2xl font-dynapuff text-white";
const primaryButtonClasses =
  "inline-flex items-center justify-center rounded-xl border-2 border-violet-900 bg-violet-600 px-4 py-2 font-dynapuff text-sm text-white shadow-md transition-colors duration-200 hover:bg-violet-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-violet-600 disabled:cursor-not-allowed disabled:opacity-60";
const outlineButtonClasses =
  "inline-flex items-center justify-center rounded-xl border-2 border-violet-900 bg-white/80 px-4 py-2 font-dynapuff text-sm text-violet-900 shadow-md transition-colors duration-200 hover:bg-violet-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-violet-600 disabled:cursor-not-allowed disabled:opacity-60";
const inputClasses =
  "w-full rounded-xl border-2 border-white/60 bg-white/90 px-4 py-2 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500";
const dangerMessageClasses =
  "rounded-xl border border-rose-300 bg-rose-100/80 px-4 py-3 text-sm font-medium text-rose-700";

function PlayerDetails({
  players,
  maxPhotos,
  showUploadCounts = false,
  className = "",
}) {
  const hasLimit = typeof maxPhotos === "number" && Number.isFinite(maxPhotos);

  return (
    <div className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {players.map(({ player, uploads, meetsUploadRequirement }, index) => (
        <div
          key={player.id}
          className='flex flex-col items-center gap-2 text-white'>
          <div className='relative'>
            <img
              src={
                player.photoURL ||
                `https://api.dicebear.com/7.x/croodles/svg?seed=${
                  player.avatarSeed || player.id
                }&size=200`
              }
              alt={player.name}
              className='h-32 w-32 avatar-float'
              style={{ animationDelay: `${index * 0.8}s` }}
            />
            {meetsUploadRequirement && (
              <span className='absolute -bottom-2 -right-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-xs font-semibold text-white shadow-lg'>
                ✓
              </span>
            )}
          </div>
          <div className='text-center'>
            <div className='font-dynapuff text-sm'>{player.name}</div>
            {showUploadCounts && uploads > 0 && (
              <div className='mt-1 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80'>
                {hasLimit ? `${uploads}/${maxPhotos}` : `${uploads}`} photo
                {uploads === 1 ? "" : "s"}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function buildScoreMap(photos) {
  const scores = {};
  photos.forEach((photo) => {
    const answers = photo.guesses || {};
    Object.entries(answers).forEach(([userId, targetUserId]) => {
      if (targetUserId === photo.uploadedBy) {
        scores[userId] = (scores[userId] || 0) + 100;
      }
    });
  });
  return scores;
}

export default function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, ensureUser, applyProfile, initializing } = useAuthUser();
  const { room, users, photos, messages, loading, error, host, allReady } =
    useRoomData(roomId, !!user);
  const actions = useRoomActions(roomId);
  const { formatted: timerLabel, secondsLeft } = useCountdown(
    room?.timerEndsAt
  );

  const [nameInput, setNameInput] = useState("");
  const [avatarChoice, setAvatarChoice] = useState(null);
  const [joinError, setJoinError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [autoStageFlag, setAutoStageFlag] = useState(null);
  const [mobilePanel, setMobilePanel] = useState(null);
  const [lastMobilePanel, setLastMobilePanel] = useState(null);
  const [resultsPhase, setResultsPhase] = useState("idle");
  const [visibleGuessers, setVisibleGuessers] = useState(0);
  const [animatedPhotoId, setAnimatedPhotoId] = useState(null);

  const authReadyRef = useRef(false);
  const currentUserId = user?.uid;
  const currentUserDoc = useMemo(
    () => users.find((entry) => entry.id === currentUserId) || null,
    [users, currentUserId]
  );
  const userMap = useMemo(
    () => Object.fromEntries(users.map((entry) => [entry.id, entry])),
    [users]
  );
  const isHost = currentUserDoc?.role === "host";
  const status = room?.status || "loading";
  const interactionLocked = status === "join" ? !!currentUserDoc?.ready : false;

  const openMobilePanel = useCallback((panel) => {
    setMobilePanel(panel);
    setLastMobilePanel(panel);
  }, []);

  const lobbyAvatarPositions = useMemo(() => {
    const uploads = users.length;
    if (!uploads) return [];
    const radius = Math.min(38, 18 + uploads * 4);
    return users.map((user, index) => {
      const angle = (index / uploads) * Math.PI * 2;
      const top = 50 + radius * Math.sin(angle);
      const left = 50 + radius * Math.cos(angle);
      return {
        id: user.id,
        top: `${Math.max(12, Math.min(88, top))}%`,
        left: `${Math.max(12, Math.min(88, left))}%`,
      };
    });
  }, [users]);

  const closeMobilePanel = useCallback(() => setMobilePanel(null), []);

  useEffect(() => {
    if (authReadyRef.current) return;
    ensureUser()
      .catch((err) => {
        console.error("Failed to ensure user", err);
      })
      .finally(() => {
        authReadyRef.current = true;
      });
  }, [ensureUser]);

  useEffect(() => {
    if (currentUserDoc?.name && !nameInput) {
      setNameInput(currentUserDoc.name);
    }
    if (currentUserDoc?.avatarSeed && !avatarChoice) {
      setAvatarChoice({
        seed: currentUserDoc.avatarSeed,
        url: currentUserDoc.photoURL,
      });
    }
  }, [currentUserDoc, nameInput, avatarChoice]);

  useEffect(() => {
    setAutoStageFlag(null);
  }, [status]);

  useEffect(() => {
    if (status !== "results") {
      setResultsPhase("idle");
      setVisibleGuessers(0);
      setAnimatedPhotoId(null);
    }
  }, [status]);

  const maxPhotos =
    room?.maxPhotos && Number.isFinite(room.maxPhotos) ? room.maxPhotos : null;

  const myPhotos = useMemo(
    () => photos.filter((photo) => photo.uploadedBy === currentUserId),
    [photos, currentUserId]
  );

  const playerUploadCounts = useMemo(() => {
    const counts = users.reduce((acc, user) => {
      acc[user.id] = 0;
      return acc;
    }, {});
    photos.forEach((photo) => {
      if (photo.uploadedBy && counts.hasOwnProperty(photo.uploadedBy)) {
        counts[photo.uploadedBy] += 1;
      }
    });
    return counts;
  }, [photos, users]);

  const playerDetails = useMemo(
    () =>
      users.map((player) => {
        const uploads = playerUploadCounts[player.id] || 0;
        const meetsUploadRequirement = maxPhotos
          ? uploads >= maxPhotos
          : uploads >= 1;
        return { player, uploads, meetsUploadRequirement };
      }),
    [playerUploadCounts, users, maxPhotos]
  );

  const scoreboard = useMemo(() => {
    if (!Array.isArray(users)) return [];
    return [...users]
      .map((userEntry) => ({ ...userEntry }))
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [users]);

  const orderedResultsPhotos = useMemo(() => {
    if (!Array.isArray(photos)) return [];
    return [...photos].sort((a, b) => {
      const diff =
        getTimestampValue(a.createdAt) - getTimestampValue(b.createdAt);
      if (diff !== 0) return diff;
      return (a.id || "").localeCompare(b.id || "");
    });
  }, [photos]);

  const totalResultPhotos = orderedResultsPhotos.length;
  const rawResultsIndex =
    typeof room?.resultsIndex === "number" ? room.resultsIndex : 0;
  const currentResultsIndex =
    totalResultPhotos > 0
      ? Math.min(Math.max(rawResultsIndex, 0), totalResultPhotos - 1)
      : 0;
  const currentResultPhoto =
    totalResultPhotos > 0 ? orderedResultsPhotos[currentResultsIndex] : null;
  const currentResultUploader = currentResultPhoto
    ? userMap[currentResultPhoto.uploadedBy] || null
    : null;

  const currentCorrectGuessers = useMemo(() => {
    if (!currentResultPhoto) return [];
    const guesses = currentResultPhoto.guesses || {};
    return Object.entries(guesses)
      .filter(([, target]) => target === currentResultPhoto.uploadedBy)
      .map(([uid]) => userMap[uid])
      .filter(Boolean);
  }, [currentResultPhoto, userMap]);

  const displayedGuessers = useMemo(
    () => currentCorrectGuessers.slice(0, Math.max(0, visibleGuessers)),
    [currentCorrectGuessers, visibleGuessers]
  );

  const isFinalResultPhoto =
    totalResultPhotos > 0 && currentResultsIndex >= totalResultPhotos - 1;
  const canAdvanceResults =
    resultsPhase === "done" &&
    isHost &&
    animatedPhotoId === currentResultPhoto?.id;
  const resultsAdvanceLabel = isFinalResultPhoto ? "Finish Game" : "Next Photo";
  const iGuessedCurrent =
    !!currentUserId &&
    !!currentResultPhoto?.guesses &&
    currentResultPhoto.guesses[currentUserId] ===
      currentResultPhoto?.uploadedBy;

  useEffect(() => {
    if (status !== "results" || !currentResultPhoto) {
      return;
    }
    setAnimatedPhotoId(currentResultPhoto.id || null);
    setResultsPhase("photo");
    setVisibleGuessers(0);
    const timers = [];
    const revealUploaderAt = 1200;
    const revealGuessesAt = 2400;
    timers.push(
      setTimeout(() => setResultsPhase("uploader"), revealUploaderAt)
    );
    timers.push(setTimeout(() => setResultsPhase("guesses"), revealGuessesAt));
    currentCorrectGuessers.forEach((_, index) => {
      timers.push(
        setTimeout(() => {
          setVisibleGuessers((prev) => {
            const next = Math.max(prev, index + 1);
            return next;
          });
        }, revealGuessesAt + (index + 1) * 400)
      );
    });
    const doneDelay =
      revealGuessesAt +
      (currentCorrectGuessers.length > 0
        ? currentCorrectGuessers.length * 400 + 600
        : 800);
    timers.push(setTimeout(() => setResultsPhase("done"), doneDelay));
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [status, currentResultPhoto?.id, currentCorrectGuessers]);

  const stageTitle =
    {
      join: "Lobby",
      upload: "Round 1: Upload",
      guess: "Round 2: Guess",
      results: "Round 3: Results",
      complete: "Complete",
    }[status] || "Room";

  const joinRoom = async () => {
    setJoinError("");
    try {
      const ensured = await ensureUser();
      const uid = ensured.uid;
      const avatarUrl = avatarChoice?.url ?? ensured.photoURL ?? null;
      await applyProfile(nameInput || "Guest", avatarUrl);
      await actions.joinRoom({
        userId: uid,
        name: nameInput || "Guest",
        avatarSeed: avatarChoice?.seed ?? null,
        photoURL: avatarUrl,
        role: ensured.uid === host?.id ? "host" : "guest",
      });
    } catch (err) {
      console.error("Failed to join room", err);
      setJoinError(err.message || "Unable to join room.");
    }
  };

  const toggleReady = async (next) => {
    if (!currentUserId) return;
    await actions.toggleReady(currentUserId, next);
  };

  const sendChat = async (text) => {
    if (!currentUserDoc) return;
    await actions.sendMessage({
      userName: currentUserDoc.name,
      userPhoto: currentUserDoc.photoURL,
      text,
    });
  };

  const uploadPhoto = async (file) => {
    if (!file || !currentUserDoc) return;
    setUploading(true);
    try {
      await actions.uploadRoomPhoto({
        roomId,
        file,
        ownerId: currentUserDoc.id,
        ownerName: currentUserDoc.name,
      });
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploading(false);
    }
  };

  const assignGuess = async ({ photoId, targetUserId }) => {
    if (!currentUserDoc || interactionLocked) return;
    await actions.assignPhotoToUser({
      photoId,
      targetUserId,
      actingUserId: currentUserDoc.id,
    });
  };

  const handleRemovePhoto = useCallback(
    async (photo) => {
      if (!photo?.id) return;
      try {
        await actions.removePhoto(photo.id, photo.storagePath);
      } catch (err) {
        console.error("Failed to remove photo", err);
      }
    },
    [actions]
  );

  const canRemovePhoto = useCallback(
    (photo) => status === "upload" && photo.uploadedBy === currentUserDoc?.id,
    [status, currentUserDoc?.id]
  );

  const computeTimerEndsAt = useCallback(
    (playerCount) => {
      const perPlayer = room?.timerPerUserSeconds ?? 30;
      const totalSeconds = computeStageDurationSeconds(playerCount, perPlayer);
      return Date.now() + totalSeconds * 1000;
    },
    [room?.timerPerUserSeconds]
  );

  const startUploadStage = useCallback(async () => {
    if (!isHost || transitioning) return;
    setTransitioning(true);
    try {
      const playerCount = users.length || 1;
      if (room?.uploadsdownEnabled) {
        await actions.setTimer({ endsAt: computeTimerEndsAt(playerCount) });
      } else {
        await actions.setTimer({ endsAt: null });
      }
      await actions.resetReadyForAll();
      await actions.changeStatus("upload", { stage: "upload" });
    } finally {
      setTransitioning(false);
    }
  }, [
    isHost,
    transitioning,
    users,
    room?.uploadsdownEnabled,
    actions,
    computeTimerEndsAt,
  ]);

  const startGuessStage = useCallback(async () => {
    if (!isHost || transitioning) return;
    setTransitioning(true);
    try {
      const playerCount = users.length || 1;
      if (room?.uploadsdownEnabled) {
        await actions.setTimer({ endsAt: computeTimerEndsAt(playerCount) });
      } else {
        await actions.setTimer({ endsAt: null });
      }
      await actions.resetReadyForAll();
      await actions.changeStatus("guess", { stage: "guess" });
    } finally {
      setTransitioning(false);
    }
  }, [
    isHost,
    transitioning,
    users,
    room?.uploadsdownEnabled,
    actions,
    computeTimerEndsAt,
  ]);

  const showResultsStage = useCallback(async () => {
    if (!isHost || transitioning) return;
    setTransitioning(true);
    try {
      const roundScores = buildScoreMap(photos);
      const scoreUpdates = Object.entries(roundScores).map(([userId, delta]) =>
        actions.recordScore({ userId, delta })
      );
      await Promise.all(scoreUpdates);
      await actions.setTimer({ endsAt: null });
      await actions.changeStatus("results", {
        stage: "results",
        resultsAppliedAt: Date.now(),
        resultsIndex: 0,
      });
    } finally {
      setTransitioning(false);
    }
  }, [actions, isHost, photos, transitioning]);

  const completeRoom = useCallback(async () => {
    if (!isHost || transitioning) return;
    setTransitioning(true);
    try {
      await actions.completeRoom();
    } finally {
      setTransitioning(false);
    }
  }, [actions, isHost, transitioning]);

  const handleResultsAdvance = useCallback(async () => {
    if (!currentResultPhoto || !isHost) {
      return;
    }
    if (animatedPhotoId !== currentResultPhoto.id) return;
    if (transitioning) return;
    setResultsPhase("idle");
    setVisibleGuessers(0);
    setAnimatedPhotoId(null);
    setTransitioning(true);
    try {
      if (isFinalResultPhoto) {
        await actions.completeRoom();
      } else {
        await actions.setResultsIndex(currentResultsIndex + 1);
      }
    } catch (err) {
      console.error("Failed to advance results", err);
    } finally {
      setTransitioning(false);
    }
  }, [
    actions,
    animatedPhotoId,
    currentResultPhoto,
    currentResultsIndex,
    isFinalResultPhoto,
    isHost,
    transitioning,
  ]);

  useEffect(() => {
    if (!room || !isHost) return;
    if (autoStageFlag) return;

    if (status === "upload") {
      if (
        photos.length > 0 &&
        ((room.uploadsdownEnabled && secondsLeft === 0) || allReady)
      ) {
        setAutoStageFlag("upload");
        startGuessStage();
      }
    } else if (status === "guess") {
      if ((room.uploadsdownEnabled && secondsLeft === 0) || allReady) {
        setAutoStageFlag("guess");
        showResultsStage();
      }
    }
  }, [
    room,
    status,
    isHost,
    allReady,
    secondsLeft,
    startGuessStage,
    showResultsStage,
    autoStageFlag,
    photos.length,
  ]);

  if (loading || initializing) {
    return (
      <div className='min-h-screen flex flex-col items-center justify-center gap-4 px-6'>
        <div className='rounded-2xl bg-white/10 px-12 py-8 text-center backdrop-blur'>
          <div className={`${sectionTitleClasses} mb-0`}>Loading room…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='min-h-screen flex flex-col items-center justify-center gap-4 px-6 py-8'>
        <div className='w-full max-w-[480px] rounded-2xl bg-white/10 p-8 text-center text-white shadow-lg backdrop-blur'>
          <div className={`${sectionTitleClasses} mb-2`}>We hit a snag</div>
          <p className='text-sm text-white/80'>
            {error.message || "Unknown error."}
          </p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className='min-h-screen flex flex-col items-center justify-center gap-4 px-6 py-8'>
        <div className='w-full max-w-[480px] rounded-2xl bg-white/10 p-8 text-center text-white shadow-lg backdrop-blur'>
          <div className={`${sectionTitleClasses} mb-4`}>
            This room no longer exists.
          </div>
          <button
            className={primaryButtonClasses}
            onClick={() => navigate("/")}>
            Start a new room
          </button>
        </div>
      </div>
    );
  }

  const renderJoinStage = () => {
    if (!currentUserDoc) {
      return (
        <div className='grid max-w-[640px] gap-6'>
          <div className='grid gap-4 rounded-2xl bg-white/5 p-6 shadow-lg backdrop-blur'>
            <div>
              <div className={`${sectionTitleClasses} mb-1`}>Display name</div>
              <input
                className={inputClasses}
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                placeholder='Your name'
              />
            </div>
            <AvatarPicker
              value={avatarChoice}
              onChange={setAvatarChoice}
              label='Choose your avatar'
            />
            {joinError && (
              <div className={dangerMessageClasses}>{joinError}</div>
            )}
            <button
              className={primaryButtonClasses}
              type='button'
              onClick={joinRoom}>
              Join room
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <p className='text-sm text-white/80'>
            Hey {currentUserDoc.name}, please wait for everyone to be ready.
            Your host will launch the upload phase.
          </p>
          <ReadyToggle isReady={currentUserDoc.ready} onToggle={toggleReady} />
        </div>

        <div className='relative flex-grow'>
          <div className='absolute inset-0'>
            {lobbyAvatarPositions.map(({ id, top, left }, index) => {
              const player = userMap[id];
              if (!player) return null;
              return (
                <div
                  key={id}
                  className='absolute flex flex-col items-center gap-2 transition-transform duration-300'
                  style={{ top, left, transform: "translate(-50%, -50%)" }}>
                  <img
                    src={
                      player.photoURL ||
                      `https://api.dicebear.com/7.x/croodles/svg?seed=${
                        player.avatarSeed || player.id
                      }&size=160`
                    }
                    alt={player.name}
                    className={`h-32 w-32 avatar-float`}
                    style={{ animationDelay: `${index * 0.8}s` }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {isHost && (
          <button
            className={primaryButtonClasses}
            type='button'
            onClick={startUploadStage}
            disabled={!allReady || transitioning || users.length < 2}>
            {transitioning ? "Starting…" : "Start Game"}
          </button>
        )}
        {!isHost && (
          <div className='rounded-xl bg-white/10 px-4 py-3 text-sm text-white/80'>
            Only the host can start the game.
          </div>
        )}
      </>
    );
  };

  const renderUploadStage = () => {
    const uploadLimitReached = maxPhotos ? myPhotos.length >= maxPhotos : false;
    const uploadDisabled = uploading || uploadLimitReached;

    return (
      <div className='relative flex min-h-0 flex-col flex-grow gap-6'>
        <PlayerDetails
          players={playerDetails}
          maxPhotos={maxPhotos}
          showUploadCounts
        />

        <div>
          <div className={`${sectionTitleClasses} mb-1`}>Upload your photo</div>
          <p className='text-sm text-white/80'>
            {maxPhotos
              ? `Upload ${maxPhotos} photo${maxPhotos > 1 ? "s" : ""}.`
              : "Upload at least one photo."}
          </p>
        </div>

        <label
          aria-disabled={uploadDisabled}
          className={`group relative flex min-h-[240px] w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-white/40 bg-white/10 px-6 py-8 text-center transition focus-within:border-violet-400 focus-within:bg-white/15 ${
            uploadDisabled
              ? "cursor-not-allowed opacity-60"
              : "cursor-pointer hover:border-white/70 hover:bg-white/10"
          }`}>
          <input
            type='file'
            accept='image/*'
            className='absolute inset-0 h-full w-full cursor-pointer opacity-0'
            disabled={uploadDisabled}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                uploadPhoto(file);
                event.target.value = "";
              }
            }}
          />
          <div className='pointer-events-none flex flex-col items-center gap-4 text-white'>
            <ArrowUpTrayIcon className='h-12 w-12 text-white/70 transition group-hover:text-white' />
            {uploadDisabled ? (
              <div className='space-y-1'>
                <p className='text-base font-semibold'>
                  {uploadLimitReached
                    ? "Upload limit reached"
                    : "Uploading photo…"}
                </p>
                <p className='text-sm text-white/70'>
                  {uploadLimitReached
                    ? maxPhotos === 1
                      ? "Remove your photo if you need to upload a different one."
                      : `You've already added ${maxPhotos} photos for this round.`
                    : "Hang tight while we finish uploading your image."}
                </p>
              </div>
            ) : (
              <div className='space-y-1'>
                <p className='text-base font-semibold'>Drag & drop a photo</p>
                <p className='text-sm text-white/70'>
                  or click to choose a file
                </p>
              </div>
            )}
          </div>
        </label>

        <div className='flex-grow'>
          <PhotoGallery
            title='Your uploads'
            photos={myPhotos}
            onRemove={handleRemovePhoto}
            canRemove={canRemovePhoto}
          />
        </div>

        {isHost && (
          <button
            className={primaryButtonClasses}
            type='button'
            onClick={startGuessStage}
            disabled={transitioning}>
            {transitioning ? "Advancing…" : "Move to guessing"}
          </button>
        )}
      </div>
    );
  };

  const renderGuessStage = () => (
    <div className='flex min-h-0 flex-col flex-grow gap-6 overflow-hidden'>
      <header className='shrink-0'>
        <div className={`${sectionTitleClasses} mb-1`}>
          Match every photo to the right person
        </div>
        <p className='text-sm text-white/80'>
          Drag photos onto a player. You can reassign until you are happy.
        </p>
      </header>

      <div className='flex-1 min-h-0 overflow-hidden'>
        <GuessBoard
          users={users}
          photos={photos}
          currentUserId={currentUserDoc?.id}
          onAssign={assignGuess}
          disabled={interactionLocked}
        />
      </div>

      {isHost && (
        <button
          className={`${primaryButtonClasses} shrink-0`}
          type='button'
          onClick={showResultsStage}
          disabled={transitioning}>
          {transitioning ? "Scoring…" : "Reveal results"}
        </button>
      )}
    </div>
  );

  const renderResultsStage = () => {
    if (!currentResultPhoto) {
      return (
        <div className='flex flex-row justify-center items-center'>
          <p className='text-sm text-white/80'>
            No photos to review yet. Hang tight!
          </p>
        </div>
      );
    }

    const photoVisible = resultsPhase !== "idle";
    const uploaderVisible =
      resultsPhase === "uploader" ||
      resultsPhase === "guesses" ||
      resultsPhase === "done";
    const guessesVisible =
      resultsPhase === "guesses" || resultsPhase === "done";
    const waitingForHost =
      resultsPhase === "done" &&
      animatedPhotoId === currentResultPhoto.id &&
      !isHost;

    return (
      <div className='flex-grow flex flex-col'>
        <div className='flex flex-grow flex-row justify-center items-center'>
          <div className='relative w-5/6 md:w-3/4 lg:w-1/2 xl:w-1/3 2xl:w-1/4'>
            {/* photo result */}
            <div
              className={` shadow-lg transition-all duration-500 ease-out ${
                photoVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6"
              }`}>
              <img
                key={currentResultPhoto.id}
                src={currentResultPhoto.url}
                alt={`Photo uploaded by ${
                  currentResultUploader?.name || "player"
                }`}
                className='h-full w-full object-cover'
              />
            </div>

            {/* uploader result */}
            <div
              className={`absolute -top-16 -right-16 transition-all duration-500 ease-out ${
                uploaderVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6"
              }`}>
              <div className='flex flex-col items-center'>
                <img
                  src={
                    currentResultUploader?.photoURL ||
                    `https://api.dicebear.com/7.x/croodles/svg?seed=${
                      currentResultUploader?.avatarSeed ||
                      currentResultUploader?.id ||
                      "unknown"
                    }&size=120`
                  }
                  alt={currentResultUploader?.name || "Uploader"}
                  className='h-32 w-auto block'
                />
                <div className='bg-rose-500 px-2 rounded-full text-base font-semibold'>
                  {currentResultUploader?.name || "Unknown"}
                </div>
              </div>
            </div>

            {/* guessers result */}
            <div
              className={`mt-2 flex flex-row transition-all duration-500 ease-out ${
                guessesVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6"
              }`}>
              {currentCorrectGuessers.length === 0 ? (
                <div className='rounded-full bg-violet-600/80 px-3 py-1 text-xs font-semibold text-white shadow-sm transition-all duration-300 ease-out'>
                  No one guessed correctly this time.
                </div>
              ) : (
                <div className='flex flex-wrap gap-2'>
                  {displayedGuessers.map((player, index) => (
                    <span
                      key={player.id}
                      className='rounded-full bg-violet-600/80 px-3 py-1 text-xs font-semibold text-white shadow-sm transition-all duration-300 ease-out'
                      style={{ transitionDelay: `${index * 120}ms` }}>
                      {player.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* points */}
            <div
              className={`absolute -top-10 flex flex-row justify-center items-center transition-all duration-700 text-2xl font-dynapuff text-white bg-rose-500 rounded-full px-2 ${
                guessesVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6"
              }`}>
              {iGuessedCurrent ? "+100!" : "+0"}
              <span className='inline-block text-sm ml-2'>
                ({iGuessedCurrent ? "Let's go" : "You flubbed it"}!)
              </span>
            </div>
          </div>
        </div>

        {canAdvanceResults && (
          <div className='flex justify-end'>
            <button
              type='button'
              onClick={handleResultsAdvance}
              className={primaryButtonClasses}
              disabled={transitioning}>
              {transitioning
                ? isFinalResultPhoto
                  ? "Finishing..."
                  : "Advancing..."
                : resultsAdvanceLabel}
            </button>
          </div>
        )}

        {waitingForHost && (
          <div className='text-right text-sm text-white/70'>
            Waiting for {host?.name || "the host"} to continue...
          </div>
        )}
      </div>
    );
  };

  const renderCompleteStage = () => (
    <div className='grid gap-6'>
      <div className='grid gap-3 rounded-2xl bg-white/5 p-6 text-center text-white shadow-lg backdrop-blur'>
        <div className={`${sectionTitleClasses} mb-1`}>Game complete</div>
        <p className='text-sm text-white/80'>
          Relive the chaos whenever you want. Start a new room to play again.
        </p>
        <div className='grid gap-2.5'>
          {scoreboard.map((player, index) => (
            <div
              key={player.id}
              className='flex items-center justify-between rounded-xl bg-white/10 px-4 py-3 text-left text-white shadow-sm'>
              <span className='font-semibold'>
                {index + 1}. {player.name}
              </span>
              <span className='font-semibold'>{player.score || 0} pts</span>
            </div>
          ))}
        </div>
        <div className='mt-4 flex justify-center gap-3'>
          <button
            className={primaryButtonClasses}
            onClick={() => navigate("/room/new")}>
            Play again
          </button>
          <button
            className={outlineButtonClasses}
            onClick={() => navigate("/")}>
            Return home
          </button>
        </div>
      </div>
    </div>
  );

  const activeMobilePanel = mobilePanel ?? lastMobilePanel;

  let mainContent;
  if (status === "join") mainContent = renderJoinStage();
  else if (status === "upload") mainContent = renderUploadStage();
  else if (status === "guess") mainContent = renderGuessStage();
  else if (status === "results") mainContent = renderResultsStage();
  else if (status === "complete") mainContent = renderCompleteStage();
  else mainContent = <div className='text-white'>Loading…</div>;

  return (
    <div className='flex flex-col min-h-screen w-full'>
      <header className='mb-4 shrink-0 flex flex-wrap items-center gap-2 py-2 px-6 text-white'>
        <div className='text-2xl font-dynapuff'>
          {room?.gameName || "Untitled game"}
        </div>
        <div className='capitalize'>{stageTitle}</div>
        <div className='flex-grow text-2xl font-dynapuff text-right'>
          {room?.countdownEnabled ? timerLabel : "Timer off"}
        </div>
      </header>
      <div className='flex-1 min-h-0 overflow-hidden grid grid-rows-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_340px]'>
        <section className='relative flex min-h-0 h-full flex-col overflow-hidden px-4 pb-4 lg:px-6 lg:pb-6'>
          {mainContent}
          <div className='flex flex-row justify-end gap-3 mt-2 lg:hidden'>
            <button
              type='button'
              onClick={() => openMobilePanel("players")}
              className='rounded-full bg-white/90 p-2 text-violet-900 shadow-xl ring-2 ring-violet-400/40 transition hover:bg-white'
              aria-label='Open player list'>
              <UsersIcon className='h-6 w-6' />
            </button>
            {status !== "complete" && (
              <button
                type='button'
                onClick={() => openMobilePanel("chat")}
                className='rounded-full bg-white/90 p-2 text-violet-900 shadow-xl ring-2 ring-violet-400/40 transition hover:bg-white'
                aria-label='Open chat panel'>
                <ChatBubbleLeftRightIcon className='h-6 w-6' />
              </button>
            )}
          </div>
        </section>
        <aside className='hidden min-h-0 overflow-hidden flex-col gap-2 md:gap-3 lg:flex'>
          <PlayerList
            users={users}
            currentUserId={currentUserId}
            showReadyState={status === "join"}
          />
          {status !== "complete" && (
            <ChatPanel
              messages={messages}
              onSend={sendChat}
              disabled={interactionLocked}
            />
          )}
        </aside>
      </div>

      <Transition
        appear
        show={mobilePanel !== null}
        as={Fragment}
        afterLeave={() => setLastMobilePanel(null)}>
        <Dialog
          as='div'
          className='relative z-50 lg:hidden'
          onClose={closeMobilePanel}>
          <TransitionChild
            as={Fragment}
            enter='ease-out duration-200'
            enterFrom='opacity-0'
            enterTo='opacity-100'
            leave='ease-in duration-150'
            leaveFrom='opacity-100'
            leaveTo='opacity-0'>
            <div className='fixed inset-0 bg-slate-950/60 backdrop-blur-sm' />
          </TransitionChild>

          <div className='fixed inset-0 overflow-y-auto'>
            <div className='flex min-h-full items-end justify-center p-4 text-center sm:items-center'>
              <TransitionChild
                as={Fragment}
                enter='ease-out duration-200'
                enterFrom='opacity-0 translate-y-6 sm:translate-y-0 sm:scale-95'
                enterTo='opacity-100 translate-y-0 sm:scale-100'
                leave='ease-in duration-150'
                leaveFrom='opacity-100 translate-y-0 sm:scale-100'
                leaveTo='opacity-0 translate-y-6 sm:translate-y-0 sm:scale-95'>
                <DialogPanel className='w-full max-w-md transform overflow-hidden rounded-3xl bg-slate-800 p-5 text-left align-middle shadow-2xl backdrop-blur'>
                  <div className='mb-4 flex items-center justify-between gap-4'>
                    <DialogTitle className='text-lg font-dynapuff text-white'>
                      {activeMobilePanel === "players" ? "Players" : "Chat"}
                    </DialogTitle>
                    <button
                      type='button'
                      onClick={closeMobilePanel}
                      className='rounded-full bg-white/70 p-2 text-slate-600 hover:bg-white'>
                      <XMarkIcon className='h-5 w-5' />
                    </button>
                  </div>
                  <div className='h-[80vh] overflow-hidden'>
                    {activeMobilePanel === "players" ? (
                      <PlayerList
                        users={users}
                        noTitle={true}
                        currentUserId={currentUserId}
                        showReadyState={status === "join"}
                      />
                    ) : (
                      <ChatPanel
                        messages={messages}
                        onSend={sendChat}
                        noTitle={true}
                        disabled={interactionLocked}
                      />
                    )}
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
