import { createRoot } from "react-dom/client";
import SevenSuppers from "../seven-suppers.jsx";

// Stand-in for the claude.ai artifact storage API when it is absent, backed by
// localStorage so the week plan and servings persist between runs. The app
// already degrades to in-memory state if localStorage is also unavailable.
if (!window.storage) {
  window.storage = {
    async get(key) {
      return { value: localStorage.getItem(key) };
    },
    async set(key, value) {
      localStorage.setItem(key, value);
    },
  };
}

createRoot(document.getElementById("root")).render(<SevenSuppers />);
