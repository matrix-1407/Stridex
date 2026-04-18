import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyACtwaN1muO2zFma4xL9w-w-u6hsOGbDo0",
  authDomain: "smart-shoe-001a.firebaseapp.com",
  databaseURL: "https://smart-shoe-001a-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-shoe-001a"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const dataRef = ref(db, "stridex/");

onValue(dataRef, (snapshot) => {
  const data = snapshot.val();

  document.getElementById("steps").innerText = data.steps;
  document.getElementById("score").innerText = data.postureScore.toFixed(1);
  document.getElementById("roll").innerText = data.roll.toFixed(2);
  document.getElementById("walked").innerText = data.walked.toFixed(2);
  document.getElementById("stability").innerText = data.stability.toFixed(1);
  document.getElementById("posture").innerText = data.posture;
  document.getElementById("activity").innerText = data.activity;
});