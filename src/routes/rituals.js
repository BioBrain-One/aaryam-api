import {
  success,
  error,
} from "../utils/response.js";

export async function ritualsRoutes(request, env, url) {
  if (
    url.pathname === "/api/rituals" &&
    request.method === "GET"
  ) {
    return getRituals(env);
  }

  if (
    url.pathname.startsWith("/api/rituals/") &&
    request.method === "GET"
  ) {
    const slug = url.pathname.split("/").pop();

    return getRitual(env, slug);
  }

  return null;
}

async function getRituals(env) {
  try {
    const result = await env.DB
      .prepare(
        `
        SELECT *
        FROM rituals
        WHERE published = 1
        ORDER BY sort_order ASC
        `
      )
      .all();

    return success(result.results);
  } catch (err) {
    return error(
      err instanceof Error
        ? err.message
        : "Unable to load rituals",
      500
    );
  }
}

async function getRitual(env, slug) {
  const ritual = await env.DB
    .prepare(
      `
      SELECT *
      FROM rituals
      WHERE slug = ?
        AND published = 1
      LIMIT 1
      `
    )
    .bind(slug)
    .first();

  if (!ritual) {
    return error("Ritual not found", 404);
  }

  return success(ritual);
}