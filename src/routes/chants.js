import {
  success,
  error,
} from "../utils/response.js";

export async function chantsRoutes(request, env, url) {
  if (
    url.pathname === "/api/chants" &&
    request.method === "GET"
  ) {
    return getChants(env);
  }

  if (
    url.pathname.startsWith("/api/chants/") &&
    request.method === "GET"
  ) {
    const slug = url.pathname.split("/").pop();

    return getChant(env, slug);
  }

  return null;
}

async function getChants(env) {
  try {
    const result = await env.DB
      .prepare(
        `
        SELECT
          id,
          slug,
          title,
          text_sanskrit,
          text_transliterated,
          meaning,
          recommended_count,
          audio_kind,
          audio_url,
          reciter,
          sort_order,
          svara_marks,
          reference_audio_url
        FROM chants
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
        : "Unable to load chants",
      500
    );
  }
}

async function getChant(env, slug) {
  if (!slug) {
    return error("Chant slug is required", 400);
  }

  try {
    const chant = await env.DB
      .prepare(
        `
        SELECT *
        FROM chants
        WHERE slug = ?
          AND published = 1
        LIMIT 1
        `
      )
      .bind(slug)
      .first();

    if (!chant) {
      return error("Chant not found", 404);
    }

    return success(chant);
  } catch (err) {
    return error(
      err instanceof Error
        ? err.message
        : "Unable to load chant",
      500
    );
  }
}