// src/firebase.js
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  updateProfile,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  addDoc,
  serverTimestamp,
  onSnapshot,
  updateDoc,
  deleteDoc,
  getDocs,
  arrayUnion,
  arrayRemove,
  query,
  orderBy,
  where,
  Timestamp,
  writeBatch,
  runTransaction,
  increment,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyAsMCnNn-kl0kcsEf_sMFoxHEPLA_TOSAs',
  authDomain: 'guess-that-photo.firebaseapp.com',
  projectId: 'guess-that-photo',
  storageBucket: 'guess-that-photo.appspot.com',
  messagingSenderId: '348485578769',
  appId: '1:348485578769:web:160407c6acd44dc10cc1b0',
  measurementId: 'G-RZSV21QLLX',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export {
  app,
  auth,
  db,
  storage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  updateProfile,
  onAuthStateChanged,
  signOut,
  collection,
  doc,
  setDoc,
  getDoc,
  addDoc,
  serverTimestamp,
  onSnapshot,
  updateDoc,
  deleteDoc,
  getDocs,
  arrayUnion,
  arrayRemove,
  query,
  orderBy,
  where,
  Timestamp,
  writeBatch,
  runTransaction,
  increment,
};
