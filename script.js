import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyACtwaN1muO2zFma4xL9w-w-u6hsOGbDo0",
  authDomain: "smart-shoe-001a.firebaseapp.com",
  databaseURL: "https://smart-shoe-001a-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "smart-shoe-001a"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const dataRef = ref(db, "stridex");

const fields = {
  steps: document.getElementById("steps"),
  score: document.getElementById("score"),
  roll: document.getElementById("roll"),
  avgRoll: document.getElementById("avg-roll"),
  distance: document.getElementById("distance"),
  walked: document.getElementById("walked"),
  stability: document.getElementById("stability"),
  posture: document.getElementById("posture"),
  activity: document.getElementById("activity"),
  alerts: document.getElementById("alerts"),
};

const connectionStatus = document.getElementById("connection-status");
const connectionDot = document.getElementById("connection-dot");

function setConnectionState(state, message) {
  connectionStatus.textContent = message;
  connectionDot.classList.toggle("live", state === "live");
  connectionDot.classList.toggle("error", state === "error");
}

function formatNumber(value, digits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "--";
  return number.toFixed(digits);
}

function setText(element, value) {
  element.textContent = value ?? "--";
}

onValue(dataRef, (snapshot) => {
  const data = snapshot.val();
  if (!data) {
    setConnectionState("error", "No data found at /stridex");
    return;
  }

  setConnectionState("live", "Live connection active");
  setText(fields.steps, data.steps);
  setText(fields.score, formatNumber(data.postureScore, 1));
  setText(fields.roll, formatNumber(data.roll, 2));
  setText(fields.avgRoll, formatNumber(data.avgRoll, 2));
  setText(fields.distance, formatNumber(data.distance, 2));
  setText(fields.walked, formatNumber(data.walked, 2));
  setText(fields.stability, formatNumber(data.stability, 1));
  setText(fields.posture, data.posture);
  setText(fields.activity, data.activity);
  setText(fields.alerts, data.alerts);
}, (error) => {
  setConnectionState("error", `Firebase error: ${error?.message || "connection failed"}`);
});