import {
  hashPassword,
  verifyPassword,
  createUserId,
  createSessionToken,
} from "../utils/auth.js";

import {
  success,
  error,
} from "../utils/response.js";

const SESSION_DAYS = 30;

export async function authRoutes(request, env, url) {
  const path = url.pathname;

  if (
    path === "/api/auth/signup" &&
    request.method === "POST"
  ) {
    return signup(request, env);
  }

  if (
    path === "/api/auth/login" &&
    request.method === "POST"
  ) {
    return login(request, env);
  }

  if (
    path === "/api/auth/me" &&
    request.method === "GET"
  ) {
    return me(request, env);
  }

  if (
    path === "/api/auth/logout" &&
    request.method === "POST"
  ) {
    return logout(request, env);
  }

  /*
   * -------------------------------------------------------
   * GOOGLE OAUTH
   * -------------------------------------------------------
   */

  if (
    path === "/api/auth/google" &&
    request.method === "GET"
  ) {
    return googleStart(request, env, url);
  }

  if (
    path === "/api/auth/google/callback" &&
    request.method === "GET"
  ) {
    return googleCallback(request, env, url);
  }

  return null;
}

/**
 * ---------------------------------------------------------
 * SIGNUP
 * ---------------------------------------------------------
 */
async function signup(request, env) {
  let body;

  try {
    body = await request.json();
  } catch {
    return error(
      "Invalid JSON request body",
      400,
    );
  }

  const email = String(
    body.email || "",
  )
    .trim()
    .toLowerCase();

  const password = String(
    body.password || "",
  );

  const fullName = String(
    body.full_name ||
      body.name ||
      "",
  ).trim();

  if (!email) {
    return error(
      "Email is required",
      400,
    );
  }

  if (!password) {
    return error(
      "Password is required",
      400,
    );
  }

  if (password.length < 8) {
    return error(
      "Password must be at least 8 characters",
      400,
    );
  }

  try {
    const existing =
      await env.DB
        .prepare(`
          SELECT id
          FROM profiles
          WHERE LOWER(email) = ?
          LIMIT 1
        `)
        .bind(email)
        .first();

    if (existing) {
      return error(
        "An account with this email already exists",
        409,
      );
    }

    const userId =
      createUserId();

    const passwordHash =
      await hashPassword(password);

    await env.DB.batch([
      env.DB
        .prepare(`
          INSERT INTO profiles (
            id,
            email,
            full_name,
            onboarded
          )
          VALUES (?, ?, ?, 0)
        `)
        .bind(
          userId,
          email,
          fullName || null,
        ),

      env.DB
        .prepare(`
          INSERT INTO auth_credentials (
            user_id,
            password_hash
          )
          VALUES (?, ?)
        `)
        .bind(
          userId,
          passwordHash,
        ),
    ]);

    const token =
      createSessionToken();

    await createSession(
      env,
      token,
      userId,
    );

    const user = {
      id: userId,
      email,
      full_name:
        fullName || null,
    };

    return success(
      {
        user,
        token,
        access_token: token,

        session: {
          token,
          access_token: token,
          user,
        },
      },
      201,
    );
  } catch (err) {
    console.error(
      "Signup error:",
      err,
    );

    return error(
      err instanceof Error
        ? err.message
        : "Unable to create account",
      500,
    );
  }
}

/**
 * ---------------------------------------------------------
 * LOGIN
 * ---------------------------------------------------------
 */
async function login(request, env) {
  let body;

  try {
    body = await request.json();
  } catch {
    return error(
      "Invalid JSON request body",
      400,
    );
  }

  const email = String(
    body.email || "",
  )
    .trim()
    .toLowerCase();

  const password = String(
    body.password || "",
  );

  if (!email || !password) {
    return error(
      "Email and password are required",
      400,
    );
  }

  try {
    const user =
      await env.DB
        .prepare(`
          SELECT
            p.id,
            p.email,
            p.full_name,
            p.phone,
            p.dob,
            p.gender,
            p.region,
            p.mode,
            p.theme,
            p.onboarded,
            p.birthday_message,
            p.timezone,
            p.place_label,
            c.password_hash
          FROM profiles p
          INNER JOIN auth_credentials c
            ON c.user_id = p.id
          WHERE LOWER(p.email) = ?
          LIMIT 1
        `)
        .bind(email)
        .first();

    if (!user) {
      return error(
        "Invalid email or password",
        401,
      );
    }

    const validPassword =
      await verifyPassword(
        password,
        user.password_hash,
      );

    if (!validPassword) {
      return error(
        "Invalid email or password",
        401,
      );
    }

    delete user.password_hash;

    const token =
      createSessionToken();

    await createSession(
      env,
      token,
      user.id,
    );

    return success({
      user,
      token,
      access_token: token,

      session: {
        token,
        access_token: token,
        user,
      },
    });
  } catch (err) {
    console.error(
      "Login error:",
      err,
    );

    return error(
      err instanceof Error
        ? err.message
        : "Unable to login",
      500,
    );
  }
}

/**
 * ---------------------------------------------------------
 * GOOGLE START
 * ---------------------------------------------------------
 */
async function googleStart(request, env, url) {
  const redirectUri =
    url.searchParams.get("redirect_uri");

  if (!redirectUri) {
    return error(
      "redirect_uri is required",
      400,
    );
  }

  const allowedRedirects = [
    "http://localhost:8081/auth/callback",
    "https://aaryam-path-guide.pages.dev/auth/callback",
    "https://aaryam-path-guide.com/auth/callback",
  ];

  if (!allowedRedirects.includes(redirectUri)) {
    console.log(
      "Invalid Google redirect URI:",
      redirectUri,
    );

    return error(
      "Invalid redirect_uri",
      400,
    );
  }

  if (!env.GOOGLE_CLIENT_ID) {
    return error(
      "Google OAuth is not configured",
      500,
    );
  }

  const statePayload = {
    nonce: crypto.randomUUID(),
    redirect_uri: redirectUri,
  };

  const state = btoa(
    JSON.stringify(statePayload),
  );

  const callbackUri =
    `${new URL(request.url).origin}/api/auth/google/callback`;

  const googleUrl = new URL(
    "https://accounts.google.com/o/oauth2/v2/auth",
  );

  googleUrl.searchParams.set(
    "client_id",
    env.GOOGLE_CLIENT_ID,
  );

  googleUrl.searchParams.set(
    "redirect_uri",
    callbackUri,
  );

  googleUrl.searchParams.set(
    "response_type",
    "code",
  );

  googleUrl.searchParams.set(
    "scope",
    "openid email profile",
  );

  googleUrl.searchParams.set(
    "access_type",
    "online",
  );

  googleUrl.searchParams.set(
    "state",
    state,
  );

  return Response.redirect(
    googleUrl.toString(),
    302,
  );
}

/**
 * ---------------------------------------------------------
 * GOOGLE CALLBACK
 * ---------------------------------------------------------
 */
async function googleCallback(
  request,
  env,
  url,
) {
  const code =
    url.searchParams.get("code");

  const state =
    url.searchParams.get("state");

  const oauthError =
    url.searchParams.get("error");

  if (oauthError) {
    return error(
      `Google authentication failed: ${oauthError}`,
      400,
    );
  }

  if (!code || !state) {
    return error(
      "Missing Google OAuth response",
      400,
    );
  }

  if (
    !env.GOOGLE_CLIENT_ID ||
    !env.GOOGLE_CLIENT_SECRET
  ) {
    return error(
      "Google OAuth is not configured",
      500,
    );
  }

  let stateData;

  try {
    stateData = JSON.parse(
      atob(state),
    );
  } catch (err) {
    console.error(
      "OAuth state decode error:",
      err,
    );

    return error(
      "Invalid OAuth state",
      400,
    );
  }

  const redirectUri =
    stateData?.redirect_uri;

  const allowedRedirects = [
    "http://localhost:8081/auth/callback",
    "https://aaryam-path-guide.pages.dev/auth/callback",
    "https://aaryam-path-guide.com/auth/callback",
  ];

  if (
    !redirectUri ||
    !allowedRedirects.includes(
      redirectUri,
    )
  ) {
    console.error(
      "Invalid OAuth redirect:",
      redirectUri,
    );

    return error(
      "Invalid OAuth redirect",
      400,
    );
  }

  try {
    const callbackUri =
      `${new URL(request.url).origin}/api/auth/google/callback`;

    /*
     * Exchange Google authorization code.
     */
    const tokenResponse =
      await fetch(
        "https://oauth2.googleapis.com/token",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },

          body:
            new URLSearchParams({
              code,
              client_id:
                env.GOOGLE_CLIENT_ID,
              client_secret:
                env.GOOGLE_CLIENT_SECRET,
              redirect_uri:
                callbackUri,
              grant_type:
                "authorization_code",
            }),
        },
      );

    if (!tokenResponse.ok) {
      const text =
        await tokenResponse.text();

      console.error(
        "Google token exchange failed:",
        text,
      );

      return error(
        "Unable to complete Google authentication",
        400,
      );
    }

    const tokenData =
      await tokenResponse.json();

    if (!tokenData.access_token) {
      return error(
        "Google did not return an access token",
        400,
      );
    }

    /*
     * Get Google profile.
     */
    const userResponse =
      await fetch(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: {
            Authorization:
              `Bearer ${tokenData.access_token}`,
          },
        },
      );

    if (!userResponse.ok) {
      return error(
        "Unable to retrieve Google account",
        400,
      );
    }

    const googleUser =
      await userResponse.json();

    const email = String(
      googleUser.email || "",
    )
      .trim()
      .toLowerCase();

    if (
      !email ||
      googleUser.email_verified !== true
    ) {
      return error(
        "Google account email could not be verified",
        400,
      );
    }

    const fullName =
      String(
        googleUser.name || "",
      ).trim() || null;

    /*
     * Find existing profile.
     */
    let profile =
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
            timezone,
            place_label
          FROM profiles
          WHERE LOWER(email) = ?
          LIMIT 1
        `)
        .bind(email)
        .first();

    /*
     * Create profile for a new Google user.
     */
    if (!profile) {
      const userId =
        createUserId();

      await env.DB
        .prepare(`
          INSERT INTO profiles (
            id,
            email,
            full_name,
            onboarded
          )
          VALUES (?, ?, ?, 0)
        `)
        .bind(
          userId,
          email,
          fullName,
        )
        .run();

      profile =
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
              timezone,
              place_label
            FROM profiles
            WHERE id = ?
            LIMIT 1
          `)
          .bind(userId)
          .first();
    }

    if (!profile) {
      return error(
        "Unable to create Google profile",
        500,
      );
    }

    /*
     * Add Google name if profile has no name.
     */
    if (
      !profile.full_name &&
      fullName
    ) {
      await env.DB
        .prepare(`
          UPDATE profiles
          SET
            full_name = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `)
        .bind(
          fullName,
          profile.id,
        )
        .run();

      profile.full_name =
        fullName;
    }

    /*
     * Create our normal D1 session.
     */
    const sessionToken =
      createSessionToken();

    await createSession(
      env,
      sessionToken,
      profile.id,
    );

    /*
     * Send token to React using URL fragment.
     */
    const destination =
      new URL(redirectUri);

    destination.hash =
      `token=${encodeURIComponent(
        sessionToken,
      )}`;

    return Response.redirect(
      destination.toString(),
      302,
    );
  } catch (err) {
    console.error(
      "Google callback error:",
      err,
    );

    return error(
      err instanceof Error
        ? err.message
        : "Google authentication failed",
      500,
    );
  }
}

/**
 * ---------------------------------------------------------
 * ME
 * ---------------------------------------------------------
 */
async function me(request, env) {
  const token =
    getToken(request);

  if (!token) {
    return error(
      "Authentication required",
      401,
    );
  }

  try {
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
      return error(
        "Invalid or expired session",
        401,
      );
    }

    const expiresAt =
      new Date(
        session.expires_at,
      ).getTime();

    if (
      Number.isNaN(expiresAt) ||
      expiresAt <= Date.now()
    ) {
      await env.DB
        .prepare(`
          DELETE FROM auth_sessions
          WHERE token = ?
        `)
        .bind(token)
        .run();

      return error(
        "Session expired",
        401,
      );
    }

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
            timezone,
            place_label
          FROM profiles
          WHERE id = ?
          LIMIT 1
        `)
        .bind(session.user_id)
        .first();

    if (!user) {
      return error(
        "User not found",
        404,
      );
    }

    return success({
      user,
      token,
      access_token: token,
    });
  } catch (err) {
    console.error(
      "Me error:",
      err,
    );

    return error(
      err instanceof Error
        ? err.message
        : "Unable to load user",
      500,
    );
  }
}

/**
 * ---------------------------------------------------------
 * LOGOUT
 * ---------------------------------------------------------
 */
async function logout(
  request,
  env,
) {
  const token =
    getToken(request);

  if (token) {
    try {
      await env.DB
        .prepare(`
          DELETE FROM auth_sessions
          WHERE token = ?
        `)
        .bind(token)
        .run();
    } catch (err) {
      console.error(
        "Logout session delete error:",
        err,
      );
    }
  }

  return success({
    message:
      "Logged out successfully",
  });
}

/**
 * ---------------------------------------------------------
 * CREATE SESSION
 * ---------------------------------------------------------
 */
async function createSession(
  env,
  token,
  userId,
) {
  const expiresAt =
    new Date(
      Date.now() +
        SESSION_DAYS *
          24 *
          60 *
          60 *
          1000,
    ).toISOString();

  await env.DB
    .prepare(`
      INSERT INTO auth_sessions (
        token,
        user_id,
        expires_at
      )
      VALUES (?, ?, ?)
    `)
    .bind(
      token,
      userId,
      expiresAt,
    )
    .run();
}

/**
 * ---------------------------------------------------------
 * GET BEARER TOKEN
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

  return header
    .substring(7)
    .trim();
}