import {
  success,
  error,
} from "../utils/response.js";

export async function aiRoutes(request, env, url) {
  if (
    url.pathname === "/api/ai/transcribe" &&
    request.method === "POST"
  ) {
    return transcribe(request, env);
  }

  if (
    url.pathname === "/api/ai/coach" &&
    request.method === "POST"
  ) {
    return coach(request, env);
  }

  return null;
}

async function transcribe(request, env) {
  return error(
    "AI transcription is not implemented yet",
    501
  );
}

async function coach(request, env) {
  return error(
    "AI coaching is not implemented yet",
    501
  );
}