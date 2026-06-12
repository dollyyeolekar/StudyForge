import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBP8FNqlX_2ShhlKDXZYvtJEMn7tCHT0nw",
  authDomain: "ai-study-assistant-316e3.firebaseapp.com",
  projectId: "ai-study-assistant-316e3",
  storageBucket: "ai-study-assistant-316e3.firebasestorage.app",
  messagingSenderId: "122020803542",
  appId: "1:122020803542:web:065a6015f0047dd009ea77",
  measurementId: "G-SQZ8GMELJD"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export default app;