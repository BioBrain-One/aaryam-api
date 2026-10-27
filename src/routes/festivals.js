import {
  success,
  error,
} from "../utils/response.js";

export async function festivalsRoutes(request, env, url) {
  if (
    url.pathname === "/api/festivals" &&
    request.method === "GET"
  ) {
    try {
      const result = await env.DB
        .prepare(
          `
          SELECT *
          FROM festivals
          WHERE published = 1
          ORDER BY month_day ASC
          `
        )
        .all();

      return success(result.results);
    } catch (err) {
      return error(
        err instanceof Error
          ? err.message
          : "Unable to load festivals",
        500
      );
    }
  }

  return null;
}