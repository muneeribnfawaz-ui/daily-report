import axios from "axios";

export const api = axios.create({
  headers: {
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Content-Type": "application/json"
  }
});
