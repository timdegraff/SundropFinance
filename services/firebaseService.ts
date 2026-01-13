import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { FIREBASE_CONFIG, INITIAL_STATE } from "../constants";
import { FinancialState } from "../types";

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

// We use a single document for this prototype to simplify state
const DOC_ID = "fy27_master_plan";

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
      // Merge with initial state structure to ensure new fields (if any) are present
      // This is a basic migration strategy
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