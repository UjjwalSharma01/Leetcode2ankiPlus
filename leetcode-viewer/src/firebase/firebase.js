import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAhAMqqyyFs5NXIi8dJtwDFyz8wH9juiJ4",
  authDomain: "leetcodetoankiplus.firebaseapp.com",
  projectId: "leetcodetoankiplus",
  storageBucket: "leetcodetoankiplus.appspot.com",
  messagingSenderId: "612904536352",
  appId: "1:612904536352:web:457a9359305c93646f2f45",
  measurementId: "G-GTN7S259P1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Analytics only in browser environment
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;