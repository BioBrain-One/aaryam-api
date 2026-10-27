import {
  success,
  error,
} from "../utils/response.js";

export async function panchangRoutes(request, env, url) {
  if (
    url.pathname === "/api/panchang" &&
    request.method === "GET"
  ) {
    return getPanchang(request, env, url);
  }

  return null;
}

async function getPanchang(request, env, url) {
  const date = url.searchParams.get("date");

  try {
    let result;

    if (date) {
      result = await env.DB
        .prepare(
          `
          SELECT *
          FROM panchang_days
          WHERE date = ?
            AND published = 1
          LIMIT 1
          `
        )
        .bind(date)
        .first();

      if (!result) {
        return error("Panchang data not found", 404);
      }

      return success(result);
    }

    result = await env.DB
      .prepare(
        `
        SELECT *
        FROM panchang_days
        WHERE published = 1
        ORDER BY date ASC
        `
      )
      .all();

    return success(result.results);
  } catch (err) {
    return error(
      err instanceof Error
        ? err.message
        : "Unable to load panchang",
      500
    );
  }
}