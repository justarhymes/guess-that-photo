import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Description, Field, Label, Switch } from "@headlessui/react";
import { collection, db, getDocs } from "../firebase.js";
import useAuthUser from "../hooks/useAuthUser.js";
import useRoomActions from "../hooks/useRoomActions.js";
import AvatarPicker from "../components/AvatarPicker.jsx";

const DEFAULT_MAX = 1;
const DEFAULT_TIMER_PER_USER = 30; // seconds added per player
const DEFAULT_TOPICS = [
  "Whose mommy is this?!",
  "Whose daddy is this?!",
  "Whose parents are these?!",
  "Who drew this?!",
  "Who is this baby?!",
].map((name, index) => ({
  id: `default-topic-${index}`,
  name,
  usedCount: null,
}));

export default function CreateRoomPage() {
  const navigate = useNavigate();
  const { ensureUser, applyProfile, user, initializing } = useAuthUser();
  const { createRoom } = useRoomActions();

  const [gameNames, setGameNames] = useState(DEFAULT_TOPICS);
  const [selectedGameName, setSelectedGameName] = useState(
    DEFAULT_TOPICS[0]?.name || ""
  );
  const [customTopic, setCustomTopic] = useState("");
  const [countdownEnabled, setCountdownEnabled] = useState(false);
  const [maxPhotos, setMaxPhotos] = useState(DEFAULT_MAX);
  const [displayName, setDisplayName] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [saving, setSaving] = useState(false);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (initializing) return;

    let isMounted = true;

    const readGameNames = async () => {
      setTopicsLoading(true);
      setTopicsError("");
      try {
        await ensureUser();

        let records = [];
        let lastError = null;

        for (const source of ["gameNames", "games"]) {
          try {
            const snapshot = await getDocs(collection(db, source));
            records = snapshot.docs
              .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
              .sort((a, b) => (b.usedCount || 0) - (a.usedCount || 0));
            lastError = null;
            if (records.length || source === "games") {
              break;
            }
          } catch (err) {
            lastError = err;
          }
        }

        if (lastError) {
          throw lastError;
        }

        if (!isMounted) return;

        const topics = records.length ? records : DEFAULT_TOPICS;
        setGameNames(topics);
        if (topics.length) {
          setSelectedGameName((prev) => prev || topics[0].name);
        }
      } catch (err) {
        console.error("Failed to load game names", err);
        if (isMounted) {
          setGameNames(DEFAULT_TOPICS);
          setSelectedGameName((prev) => prev || DEFAULT_TOPICS[0]?.name || "");
          setTopicsError(
            "Unable to fetch suggested topics. You can still write your own!"
          );
        }
      } finally {
        if (isMounted) {
          setTopicsLoading(false);
        }
      }
    };

    readGameNames();

    return () => {
      isMounted = false;
    };
  }, [ensureUser, initializing]);

  useEffect(() => {
    if (user?.displayName && !displayName) {
      setDisplayName(user.displayName);
    }
  }, [user, displayName]);

  const topic = useMemo(
    () => (customTopic.trim() ? customTopic.trim() : selectedGameName),
    [customTopic, selectedGameName]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!topic) {
      setFormError("Pick a topic or type your own.");
      return;
    }
    setFormError("");
    setSaving(true);

    try {
      const ensured = await ensureUser();
      await applyProfile(
        displayName || "Host",
        avatar?.url ?? ensured?.photoURL ?? null
      );
      const roomId = await createRoom({
        hostUid: ensured.uid,
        hostName: displayName || ensured.displayName || "Host",
        hostAvatar: avatar?.url ?? ensured.photoURL ?? null,
        hostAvatarSeed: avatar?.seed ?? null,
        gameName: topic,
        countdownEnabled,
        maxPhotos: Number.isFinite(maxPhotos) ? Number(maxPhotos) : null,
        timerPerUserSeconds: DEFAULT_TIMER_PER_USER,
      });
      navigate(`/room/${roomId}`);
    } catch (err) {
      console.error("Failed to create room", err);
      setFormError(err.message || "Could not create room.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='container py-3 px-6'>
      <form onSubmit={handleSubmit}>
        <header>
          <span className='tag-pill'>setup</span>
          <h1 className='text-5xl font-dynapuff text-white mb-8'>
            Create a new room
          </h1>
        </header>

        <div className='grid xl:grid-cols-2 xl:gap-4'>
          <div>
            <div className='text-lg font-semibold text-white mb-2'>
              Choose a hosted theme
            </div>
            {topicsLoading && (
              <div className='text-slate-700 text-sm mb-2'>Loading topics…</div>
            )}
            {topicsError && (
              <div className='bg-rose-200 text-rose-800 p-3 mb-2'>
                {topicsError}
              </div>
            )}
            <div className='grid gap-4'>
              {gameNames.map((game) => {
                const isSelected =
                  !customTopic && selectedGameName === game.name;
                return (
                  <button
                    key={game.id}
                    type='button'
                    onClick={() => {
                      setSelectedGameName(game.name);
                      setCustomTopic("");
                    }}
                    className={`p-1 rounded-xl font-dynapuff border-2 border-rose-500 ${
                      isSelected ? "bg-rose-500" : "bg-transparent"
                    }`}>
                    <div>{game.name}</div>
                    <div className='text-slate-700 text-sm'>
                      {game.usedCount || 0} plays
                    </div>
                  </button>
                );
              })}

              <label className='mb-6'>
                <span className='text-lg font-semibold text-white'>
                  ...or make your own
                </span>
                <input
                  className='block w-full text-slate-700 mt-2 p-2 border-2 border-white focus:border-rose-500 outline-0 rounded'
                  type='text'
                  name='customTopic'
                  placeholder='Whose dog is this?!'
                  value={customTopic}
                  onChange={(event) => setCustomTopic(event.target.value)}
                />
              </label>
            </div>
          </div>

          <div className='grid'>
            <div>
              <div className='mb-6'>
                <div className='text-lg font-semibold text-white'>
                  Max photos per player
                </div>
                <div className='grid grid-cols-6 xl:grid-cols-3 gap-5 xl:gap-2 mt-2'>
                  {[1, 2, 3, 4, 5, "None"].map((option) => {
                    const isSelected =
                      String(maxPhotos ?? "No Max") === String(option);
                    return (
                      <button
                        key={option}
                        type='button'
                        onClick={() =>
                          setMaxPhotos(
                            option === "No Max" ? null : Number(option)
                          )
                        }
                        className={`rounded-xl p-3 text-white focus:outline-none transition font-dynapuff text-base/4 xl:text-lg/5 border-2 border-rose-500 ${
                          isSelected ? "bg-rose-500" : "bg-transparent"
                        }`}>
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Field className='flex justify-between mb-6'>
                <div className='flex-shrink'>
                  <Label className='text-lg font-semibold text-white'>
                    Countdown timer
                  </Label>
                  <Description className='bold w-full text-slate-700 align-middle text-sm'>
                    Starts at 2 minutes, +30 seconds per player when enabled.
                  </Description>
                </div>
                <Switch
                  checked={countdownEnabled}
                  onChange={setCountdownEnabled}
                  className={`${
                    countdownEnabled ? "bg-rose-500" : "bg-gray-200"
                  } relative inline-flex items-center h-8 w-14 rounded-full`}>
                  <span className='sr-only'>Enable countdown timer</span>
                  <span
                    className={`${
                      countdownEnabled ? "translate-x-7" : "translate-x-1"
                    } inline-block w-6 h-6 transform bg-white rounded-full`}
                  />
                </Switch>
              </Field>
            </div>

            <div className='mb-6'>
              <label className='block text-lg font-semibold text-white'>
                Name
              </label>
              <input
                className='mt-2 p-2 w-full border-2 border-white focus:border-rose-500 outline-0 rounded text-slate-700'
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder='Display Name'
                required
                disabled={saving || initializing}
              />
            </div>

            <AvatarPicker
              value={avatar}
              onChange={setAvatar}
              label='Choose your guy'
            />
          </div>
        </div>

        {formError && (
          <div className='bg-rose-200 text-rose-800 p-3 mb-2'>{formError}</div>
        )}

        <div className='flex justify-between align-item-center'>
          <button
            type='button'
            className='p-3 rounded-xl text-violet-900 hover:text-violet-700 font-dynapuff text-lg flex-shrink-0 transition'
            onClick={() => navigate(-1)}
            disabled={saving}>
            Cancel
          </button>
          <button
            type='submit'
            className='bg-rose-500 p-3 rounded-xl text-white font-dynapuff text-lg hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 transition'
            disabled={saving}>
            {saving ? "Creating…" : "Create room"}
          </button>
        </div>
      </form>
    </div>
  );
}
