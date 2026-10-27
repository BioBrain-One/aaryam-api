import {
  success,
  error,
} from "../utils/response.js";

export async function eventsRoutes(request, env, url) {
  if (
    url.pathname === "/api/events" &&
    request.method === "GET"
  ) {
    return getEvents(env);
  }

  if (
    url.pathname === "/api/events/signup" &&
    request.method === "POST"
  ) {
    return signupEvent(request, env);
  }

  return null;
}

async function getEvents(env) {
  try {
    const result = await env.DB
      .prepare(
        `
        SELECT *
        FROM live_events
        WHERE published = 1
        ORDER BY date ASC, time ASC
        `
      )
      .all();

    return success(result.results);
  } catch (err) {
    return error(
      err instanceof Error
        ? err.message
        : "Unable to load events",
      500
    );
  }
}

async function signupEvent(request, env) {
  let body;

  try {
    body = await request.json();
  } catch {
    return error("Invalid JSON request body", 400);
  }

  const userId = body.user_id;
  const eventKey = body.event_key;

  if (!userId || !eventKey) {
    return error(
      "user_id and event_key are required",
      400
    );
  }

  try {
    const event = await env.DB
      .prepare(
        `
        SELECT *
        FROM live_events
        WHERE slug = ?
          AND published = 1
        LIMIT 1
        `
      )
      .bind(eventKey)
      .first();

    if (!event) {
      return error("Event not found", 404);
    }

    const id = crypto.randomUUID();

    await env.DB
      .prepare(
        `
        INSERT INTO event_signups (
          id,
          user_id,
          event_key,
          event_title,
          event_date,
          kind,
          notify,
          attending
        )
        VALUES (?, ?, ?, ?, ?, 'live', 1, 1)
        ON CONFLICT(user_id, event_key)
        DO UPDATE SET
          attending = 1
        `
      )
      .bind(
        id,
        userId,
        event.slug,
        event.title,
        event.date
      )
      .run();

    return success({
      message: "Event signup successful",
    });
  } catch (err) {
    return error(
      err instanceof Error
        ? err.message
        : "Unable to signup for event",
      500
    );
  }
}