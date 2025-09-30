import { useCallback, useMemo } from 'react';
import {
  db,
  storage,
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDocs,
  increment,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from '../firebase.js';

const baseRoomData = ({
  gameName,
  countdownEnabled,
  maxPhotos,
  hostUid,
  timerPerUserSeconds,
}) => ({
  status: 'join',
  gameName,
  countdownEnabled,
  maxPhotos,
  hostUid,
  timerPerUserSeconds,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  round: 1,
});

export default function useRoomActions(roomId) {
  const roomRef = useMemo(() => (roomId ? doc(db, 'rooms', roomId) : null), [roomId]);

  const createRoom = useCallback(async ({
    hostUid,
    hostName,
    hostAvatar,
    hostAvatarSeed,
    gameName,
    countdownEnabled,
    maxPhotos,
    timerPerUserSeconds,
  }) => {
    const roomCollection = collection(db, 'rooms');
    const newRoomRef = doc(roomCollection);

    await setDoc(newRoomRef, baseRoomData({
      gameName,
      countdownEnabled,
      maxPhotos,
      hostUid,
      timerPerUserSeconds,
    }));

    const usersRef = doc(db, 'rooms', newRoomRef.id, 'users', hostUid);
    await setDoc(usersRef, {
      id: hostUid,
      name: hostName,
      avatarSeed: hostAvatarSeed ?? null,
      photoURL: hostAvatar ?? null,
      role: 'host',
      ready: false,
      score: 0,
      joinedAt: serverTimestamp(),
      connected: true,
    });

    await addDoc(collection(db, 'rooms', newRoomRef.id, 'messages'), {
      text: `${hostName} created the room`.
        replace(/\s+/g, ' '),
      userName: 'system',
      createdAt: serverTimestamp(),
    });

    return newRoomRef.id;
  }, []);

  const joinRoom = useCallback(async ({
    userId,
    name,
    avatarSeed,
    photoURL,
    role = 'guest',
  }) => {
    if (!roomRef) throw new Error('roomId required to join room');
    const userRef = doc(roomRef, 'users', userId);
    await setDoc(userRef, {
      id: userId,
      name,
      avatarSeed: avatarSeed ?? null,
      photoURL: photoURL ?? null,
      role,
      ready: false,
      score: 0,
      joinedAt: serverTimestamp(),
      connected: true,
    }, { merge: true });

    await addDoc(collection(roomRef, 'messages'), {
      text: `${name} joined the room`,
      userName: 'system',
      createdAt: serverTimestamp(),
    });
  }, [roomRef]);

  const updateUser = useCallback(async (userId, payload) => {
    if (!roomRef) throw new Error('roomId required');
    const userRef = doc(roomRef, 'users', userId);
    await updateDoc(userRef, {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  }, [roomRef]);

  const toggleReady = useCallback(async (userId, value) => {
    if (!roomRef) throw new Error('roomId required');
    const userRef = doc(roomRef, 'users', userId);
    await updateDoc(userRef, {
      ready: value,
      readyAt: value ? serverTimestamp() : null,
    });
  }, [roomRef]);

  const sendMessage = useCallback(async ({ userName, userPhoto, text }) => {
    if (!roomRef) throw new Error('roomId required');
    await addDoc(collection(roomRef, 'messages'), {
      text,
      userName,
      userPhoto: userPhoto ?? null,
      createdAt: serverTimestamp(),
    });
  }, [roomRef]);

  const changeStatus = useCallback(async (nextStatus, extra = {}) => {
    if (!roomRef) throw new Error('roomId required');
    await updateDoc(roomRef, {
      status: nextStatus,
      updatedAt: serverTimestamp(),
      ...extra,
    });
  }, [roomRef]);

  const resetReadyForAll = useCallback(async () => {
    if (!roomRef) throw new Error('roomId required');
    const usersCollection = collection(roomRef, 'users');
    const snapshot = await getDocs(usersCollection);
    await Promise.all(
      snapshot.docs.map((docSnap) =>
        updateDoc(docSnap.ref, { ready: false, readyAt: null })
      )
    );
  }, [roomRef]);

  const uploadRoomPhoto = useCallback(async ({ roomId: overrideRoomId, file, ownerId, ownerName }) => {
    const activeRoomId = overrideRoomId ?? roomId;
    if (!activeRoomId) throw new Error('roomId required');
    if (!file) throw new Error('file required');

    const storagePath = `rooms/${activeRoomId}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    await new Promise((resolve, reject) => {
      uploadTask.on('state_changed', undefined, reject, resolve);
    });

    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
    const photosCollection = collection(db, 'rooms', activeRoomId, 'photos');
    await addDoc(photosCollection, {
      url: downloadURL,
      storagePath,
      uploadedBy: ownerId,
      uploadedByName: ownerName,
      createdAt: serverTimestamp(),
      assignedTo: null,
      guesses: {},
    });
    return downloadURL;
  }, [roomId]);

  const removePhoto = useCallback(async (photoId, storagePath) => {
    if (!roomRef) throw new Error('roomId required');
    const photoRef = doc(roomRef, 'photos', photoId);
    await deleteDoc(photoRef).catch((err) => {
      console.warn('Failed to delete photo doc', err);
    });
    if (storagePath) {
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef).catch(() => null);
    }
  }, [roomRef]);

  const assignPhotoToUser = useCallback(async ({ photoId, targetUserId, actingUserId }) => {
    if (!roomRef) throw new Error('roomId required');
    const photoRef = doc(roomRef, 'photos', photoId);
    await updateDoc(photoRef, {
      [`guesses.${actingUserId}`]: targetUserId,
      updatedAt: serverTimestamp(),
    });
  }, [roomRef]);

  const setTimer = useCallback(async ({ endsAt }) => {
    if (!roomRef) throw new Error('roomId required');
    await updateDoc(roomRef, {
      timerEndsAt: endsAt,
      timerStartedAt: serverTimestamp(),
    });
  }, [roomRef]);

  const recordScore = useCallback(async ({ userId, delta }) => {
    if (!roomRef) throw new Error('roomId required');
    const userRef = doc(roomRef, 'users', userId);
    await updateDoc(userRef, {
      score: increment(delta),
      scoreUpdatedAt: serverTimestamp(),
    });
  }, [roomRef]);

  const setResultsIndex = useCallback(async (index) => {
    if (!roomRef) throw new Error('roomId required');
    await updateDoc(roomRef, {
      resultsIndex: index,
      updatedAt: serverTimestamp(),
    });
  }, [roomRef]);

  const completeRoom = useCallback(async () => {
    if (!roomRef) throw new Error('roomId required');
    await updateDoc(roomRef, {
      status: 'complete',
      completedAt: serverTimestamp(),
    });
  }, [roomRef]);

  return {
    createRoom,
    joinRoom,
    updateUser,
    toggleReady,
    changeStatus,
    resetReadyForAll,
    sendMessage,
    uploadRoomPhoto,
    removePhoto,
    assignPhotoToUser,
    setTimer,
    recordScore,
    setResultsIndex,
    completeRoom,
  };
}
