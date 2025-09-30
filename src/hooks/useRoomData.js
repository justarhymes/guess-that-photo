import { useEffect, useMemo, useState } from 'react';
import {
  db,
  doc,
  collection,
  onSnapshot,
  query,
  orderBy,
} from '../firebase.js';

function normaliseTimestamp(ts) {
  if (!ts) return 0;
  if (typeof ts === 'number') return ts;
  if (ts.seconds) return ts.seconds * 1000 + (ts.nanoseconds || 0) / 1e6;
  return 0;
}

export default function useRoomData(roomId, enabled = true) {
  const [room, setRoom] = useState(null);
  const [users, setUsers] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!roomId || !enabled) return undefined;

    let isMounted = true;
    setLoading(true);
    setError(null);
    const readyKeys = { room: false, users: false, photos: false, messages: false };
    const markReady = (key) => {
      readyKeys[key] = true;
      if (isMounted && Object.values(readyKeys).every(Boolean)) {
        setLoading(false);
      }
    };
    const captureError = (err) => {
      console.error('Room listener error', err);
      if (isMounted) {
        setError(err);
        setLoading(false);
      }
    };

    const roomRef = doc(db, 'rooms', roomId);
    const unsubscribeRoom = onSnapshot(
      roomRef,
      (snapshot) => {
        if (!isMounted) return;
        setError(null);
        if (snapshot.exists()) {
          setRoom({ id: snapshot.id, ...snapshot.data() });
        } else {
          setRoom(null);
        }
        markReady('room');
      },
      captureError,
    );

    const usersRef = collection(db, 'rooms', roomId, 'users');
    const unsubscribeUsers = onSnapshot(
      query(usersRef, orderBy('joinedAt', 'asc')),
      (snapshot) => {
        if (!isMounted) return;
        setError(null);
        setUsers(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
        markReady('users');
      },
      captureError,
    );

    const photosRef = collection(db, 'rooms', roomId, 'photos');
    const unsubscribePhotos = onSnapshot(
      query(photosRef, orderBy('createdAt', 'asc')),
      (snapshot) => {
        if (!isMounted) return;
        setError(null);
        setPhotos(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
        markReady('photos');
      },
      captureError,
    );

    const messagesRef = collection(db, 'rooms', roomId, 'messages');
    const unsubscribeMessages = onSnapshot(
      query(messagesRef, orderBy('createdAt', 'asc')),
      (snapshot) => {
        if (!isMounted) return;
        setError(null);
        setMessages(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
        markReady('messages');
      },
      captureError,
    );

    return () => {
      isMounted = false;
      unsubscribeRoom();
      unsubscribeUsers();
      unsubscribePhotos();
      unsubscribeMessages();
    };
  }, [roomId, enabled]);

  const sortedUsers = useMemo(() => (
    [...users].sort((a, b) => normaliseTimestamp(a.joinedAt) - normaliseTimestamp(b.joinedAt))
  ), [users]);

  const host = useMemo(() => sortedUsers.find((u) => u.role === 'host') || null, [sortedUsers]);
  const readyCount = useMemo(() => sortedUsers.filter((u) => u.ready).length, [sortedUsers]);
  const allReady = useMemo(
    () => sortedUsers.length > 0 && readyCount === sortedUsers.length,
    [sortedUsers, readyCount],
  );

  return {
    room,
    users: sortedUsers,
    photos,
    messages,
    loading,
    error,
    host,
    readyCount,
    allReady,
  };
}

