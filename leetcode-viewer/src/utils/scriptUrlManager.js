import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebase';

const LOCAL_STORAGE_KEY = 'google_script_url';
const USERS_COLLECTION = 'users';

/**
 * Get script URL from localStorage
 * This is used for most operations to avoid excessive Firebase calls
 */
export function getScriptUrlFromStorage() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(LOCAL_STORAGE_KEY) || '';
  }
  return '';
}

/**
 * Set script URL in localStorage
 */
export function setScriptUrlInStorage(url) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY, url);
  }
}

/**
 * Get script URL from Firebase
 * Only called when user logs in to sync cross-device settings
 */
export async function getScriptUrlFromFirebase(userId) {
  if (!userId) return '';
  
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists() && userDoc.data().googleScriptUrl) {
      const url = userDoc.data().googleScriptUrl;
      // Update localStorage with Firebase value
      setScriptUrlInStorage(url);
      return url;
    }
    
    return '';
  } catch (error) {
    console.error("Error getting Google Script URL from Firebase:", error);
    return '';
  }
}

/**
 * Save script URL to both Firebase and localStorage
 * Called when user updates their script URL in settings
 */
export async function saveScriptUrl(userId, url) {
  // Always update localStorage for immediate use
  setScriptUrlInStorage(url);
  
  // Update Firebase if user is logged in (for cross-device sync)
  if (userId) {
    try {
      const userDocRef = doc(db, USERS_COLLECTION, userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        // Update existing document
        await setDoc(userDocRef, {
          ...userDoc.data(),
          googleScriptUrl: url,
          updatedAt: new Date()
        }, { merge: true });
      } else {
        // Create new document with settings
        await setDoc(userDocRef, {
          googleScriptUrl: url,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      return true;
    } catch (error) {
      console.error("Error saving Google Script URL to Firebase:", error);
      return false;
    }
  }
  
  return true;
}