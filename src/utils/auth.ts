import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from '../firebase/config';

const provider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<void> {
  await signInWithPopup(auth, provider);
}

export async function signOut(): Promise<void> {
  await fbSignOut(auth);
}

export function onAuthChange(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb);
}

export type { User };
