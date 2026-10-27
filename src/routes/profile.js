
import {
  success,
  error,
} from "../utils/response.js";

/**
 * ---------------------------------------------------------
 * PROFILE ROUTES
 * ---------------------------------------------------------
 */
export async function profileRoutes(
  request,
  env,
  url,
) {
  if (
    url.pathname === "/api/profile" &&
    request.method === "GET"
  ) {
    return getProfile(
      request,
      env,
    );
  }

  if (
    url.pathname === "/api/profile" &&
    ["PUT", "PATCH"].includes(
      request.method,
    )
  ) {
    return updateProfile(
      request,
      env,
    );
  }

  return null;
}

/**
 * ---------------------------------------------------------
 * GET AUTH TOKEN
 * ---------------------------------------------------------
 */
function getToken(request) {
  const header =
    request.headers.get(
      "Authorization",
    );

  if (!header) {
    return null;
  }

  if (
    !header.startsWith(
      "Bearer ",
    )
  ) {
    return null;
  }

  const token = header
    .substring(7)
    .trim();

  return token || null;
}

/**
 * ---------------------------------------------------------
 * GET USER FROM SESSION
 * ---------------------------------------------------------
 *
 * Looks up:
 *
 * Authorization: Bearer <token>
 *
 * in:
 *
 * auth_sessions
 *
 * and returns the associated user.
 */
async function getAuthenticatedUser(
  request,
  env,
) {
  const token =
    getToken(request);

  if (!token) {
    return null;
  }

  const session =
    await env.DB
      .prepare(`
        SELECT
          token,
          user_id,
          created_at,
          expires_at
        FROM auth_sessions
        WHERE token = ?
        LIMIT 1
      `)
      .bind(token)
      .first();

  if (!session) {
    return null;
  }

  /*
   * Check session expiration.
   */
  const expiresAt =
    new Date(
      session.expires_at,
    ).getTime();

  if (
    Number.isNaN(expiresAt) ||
    expiresAt <= Date.now()
  ) {
    /*
     * Delete expired session.
     */
    await env.DB
      .prepare(`
        DELETE FROM auth_sessions
        WHERE token = ?
      `)
      .bind(token)
      .run();

    return null;
  }

  /*
   * Load the actual profile.
   */
  const user =
    await env.DB
      .prepare(`
        SELECT
          id,
          email,
          full_name,
          phone,
          dob,
          gender,
          region,
          mode,
          theme,
          onboarded,
          birthday_message,
          latitude,
          longitude,
          timezone,
          place_label,
          created_at,
          updated_at
        FROM profiles
        WHERE id = ?
        LIMIT 1
      `)
      .bind(session.user_id)
      .first();

  if (!user) {
    return null;
  }

  return {
    token,
    user,
  };
}

/**
 * ---------------------------------------------------------
 * GET PROFILE
 * ---------------------------------------------------------
 */
async function getProfile(
  request,
  env,
) {
  try {
    const authenticated =
      await getAuthenticatedUser(
        request,
        env,
      );

    if (!authenticated) {
      return error(
        "User authentication required",
        401,
      );
    }

    return success(
      authenticated.user,
    );
  } catch (err) {
    console.error(
      "Get profile error:",
      err,
    );

    return error(
      err instanceof Error
        ? err.message
        : "Unable to load profile",
      500,
    );
  }
}

/**
 * ---------------------------------------------------------
 * UPDATE PROFILE
 * ---------------------------------------------------------
 */
async function updateProfile(
  request,
  env,
) {
  try {
    const authenticated =
      await getAuthenticatedUser(
        request,
        env,
      );

    if (!authenticated) {
      return error(
        "User authentication required",
        401,
      );
    }

    const userId =
      authenticated.user.id;

    let body;

    try {
      body =
        await request.json();
    } catch {
      return error(
        "Invalid JSON request body",
        400,
      );
    }

    const fields = [];
    const values = [];

    /*
     * Only these profile fields can be
     * updated by the client.
     */
    const allowedFields = [
      "full_name",
      "phone",
      "dob",
      "gender",
      "region",
      "mode",
      "theme",
      "onboarded",
      "birthday_message",
      "latitude",
      "longitude",
      "timezone",
      "place_label",
    ];

    for (
      const field of allowedFields
    ) {
      if (
        Object.prototype.hasOwnProperty.call(
          body,
          field,
        )
      ) {
        fields.push(
          `${field} = ?`,
        );

        values.push(
          body[field],
        );
      }
    }

    if (
      fields.length === 0
    ) {
      return error(
        "No profile fields supplied",
        400,
      );
    }

    fields.push(
      "updated_at = CURRENT_TIMESTAMP",
    );

    values.push(userId);

    await env.DB
      .prepare(`
        UPDATE profiles
        SET ${fields.join(", ")}
        WHERE id = ?
      `)
      .bind(...values)
      .run();

    /*
     * Return the updated profile.
     */
    const profile =
      await env.DB
        .prepare(`
          SELECT
            id,
            email,
            full_name,
            phone,
            dob,
            gender,
            region,
            mode,
            theme,
            onboarded,
            birthday_message,
            latitude,
            longitude,
            timezone,
            place_label,
            created_at,
            updated_at
          FROM profiles
          WHERE id = ?
          LIMIT 1
        `)
        .bind(userId)
        .first();

    if (!profile) {
      return error(
        "Profile not found",
        404,
      );
    }

    return success(
      profile,
    );
  } catch (err) {
    console.error(
      "Update profile error:",
      err,
    );

    return error(
      err instanceof Error
        ? err.message
        : "Unable to update profile",
      500,
    );
  }
}
