import {
  success,
  error,
} from "../utils/response.js";

export async function practiceRoutes(request, env, url) {
  if (
    url.pathname === "/api/practice" &&
    request.method === "POST"
  ) {
    return createPracticeSession(request, env);
  }

  if (
    url.pathname === "/api/practice/history" &&
    request.method === "GET"
  ) {
    return getPracticeHistory(request, env);
  }

  return null;
}

async function createPracticeSession(request, env) {
  let body;

  try {
    body = await request.json();
  } catch {
    return error("Invalid JSON request body", 400);
  }

  if (!body.user_id) {
    return error("user_id is required", 400);
  }

  if (!body.chant_slug) {
    return error("chant_slug is required", 400);
  }

  const id = crypto.randomUUID();

  try {
    await env.DB
      .prepare(
        `
        INSERT INTO practice_sessions (
          id,
          user_id,
          chant_slug,
          overall,
          pronunciation,
          rhythm,
          svara,
          svara_method,
          errors,
          tips,
          duration_s
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .bind(
        id,
        body.user_id,
        body.chant_slug,
        Number(body.overall || 0),
        Number(body.pronunciation || 0),
        Number(body.rhythm || 0),
        Number(body.svara || 0),
        body.svara_method || "steadiness",
        JSON.stringify(body.errors || []),
        JSON.stringify(body.tips || []),
        Number(body.duration_s || 0)
      )
      .run();

    return success(
      {
        id,
      },
      201
    );
  } catch (err) {
    return error(
      err instanceof Error
        ? err.message
        : "Unable to save practice session",
      500
    );
  }
}

async function getPracticeHistory(request, env) {
  const userId = new URL(request.url).searchParams.get(
    "user_id"
  );

  if (!userId) {
    return error("user_id is required", 400);
  }

  try {
    const result = await env.DB
      .prepare(
        `
        SELECT *
        FROM practice_sessions
        WHERE user_id = ?
        ORDER BY created_at DESC
        `
      )
      .bind(userId)
      .all();

    return success(result.results);
  } catch (err) {
    return error(
      err instanceof Error
        ? err.message
        : "Unable to load practice history",
      500
    );
  }
}