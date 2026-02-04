/** Type declarations for Firebase CDN imports (used by index.tsx). Stops TS from reporting "Cannot find module". */
declare module "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js" {
  export function initializeApp(config: object): unknown;
}

declare module "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js" {
  export function getFirestore(app: unknown): unknown;
  export function doc(store: unknown, ...pathSegments: string[]): unknown;
  export function setDoc(ref: unknown, data: object): Promise<void>;
  export function getDoc(ref: unknown): Promise<{ exists: () => boolean; data: () => object }>;
  export function onSnapshot(ref: unknown, callback: (snap: { exists: () => boolean; data: () => object }) => void): () => void;
}

declare module "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js" {
  export function getAuth(app: unknown): unknown;
  export function signInWithPopup(
    auth: unknown,
    provider: unknown
  ): Promise<{ user: { email?: string; photoURL?: string } }>;
  export class GoogleAuthProvider {}
  export function signOut(auth: unknown): Promise<void>;
}
