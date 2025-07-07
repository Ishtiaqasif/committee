import { GoogleAuthProvider, signInWithPopup, signOut, User, createUserWithEmailAndPassword, signInWithEmailAndPassword as firebaseSignInWithEmail, updateProfile, signInAnonymously as firebaseSignInAnonymously } from "firebase/auth";
import { auth } from "./config";
import { upsertUserProfile } from "./firestore";

const provider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    await upsertUserProfile(result.user);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google: ", error);
    return null;
  }
};

export const signUpWithEmailPassword = async (email: string, password: string, displayName: string) => {
    try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName });
        
        const profileData = {
            uid: result.user.uid,
            displayName,
            email: result.user.email,
            photoURL: result.user.photoURL,
        };
        await upsertUserProfile(profileData);
        return result.user;
    } catch (error) {
        console.error("Error signing up: ", error);
        throw error;
    }
};

export const signInWithEmailPassword = async (email: string, password: string) => {
    try {
        const result = await firebaseSignInWithEmail(auth, email, password);
        return result.user;
    } catch (error) {
        console.error("Error signing in: ", error);
        throw error;
    }
};

export const signInAnonymously = async () => {
    try {
        const result = await firebaseSignInAnonymously(auth);
        return result.user;
    } catch (error) {
        console.error("Error signing in anonymously: ", error);
        return null;
    }
};


export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out: ", error);
  }
};
