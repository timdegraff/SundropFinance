import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { FIREBASE_CONFIG, INITIAL_STATE } from "../constants.ts";
import { FinancialState } from "../types.ts";

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// We use a single document for this prototype to simplify state
const DOC_ID = "fy27_master_plan";

export const loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        return result.user;
    } catch (error) {
        console.error("Login failed", error);
        return null;
    }
};

export const logout = async () => {
    await signOut(auth);
};

export const saveState = async (state: FinancialState) => {
  try {
    await setDoc(doc(db, "plans", DOC_ID), state);
    console.log("State saved to Firebase");
    return true;
  } catch (error) {
    console.error("Error saving to Firebase:", error);
    return false;
  }
};

export const loadState = async (): Promise<FinancialState | null> => {
  try {
    const docRef = doc(db, "plans", DOC_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as FinancialState;
      return {
        ...INITIAL_STATE,
        ...data,
        tuition: {
            ...INITIAL_STATE.tuition,
            ...data.tuition
        }
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error loading from Firebase:", error);
    return null;
  }
};

// Real-time listener
export const subscribeToState = (callback: (state: FinancialState) => void) => {
    return onSnapshot(doc(db, "plans", DOC_ID), (doc) => {
        if (doc.exists()) {
             const data = doc.data() as FinancialState;
             const merged = {
                ...INITIAL_STATE,
                ...data,
                tuition: {
                    ...INITIAL_STATE.tuition,
                    ...data.tuition
                }
             };
             callback(merged);
        }
    });
};