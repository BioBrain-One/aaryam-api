import {
  success,
  error,
} from "../utils/response.js";

export async function donationsRoutes(request, env, url) {
  if (
    url.pathname === "/api/donations/classes" &&
    request.method === "GET"
  ) {
    return getDonationClasses(env);
  }

  if (
    url.pathname === "/api/donations/drives" &&
    request.method === "GET"
  ) {
    return getDonationDrives(env);
  }

  if (
    url.pathname === "/api/payment-settings" &&
    request.method === "GET"
  ) {
    return getPaymentSettings(env);
  }

  if (
    url.pathname === "/api/donations" &&
    request.method === "POST"
  ) {
    return createDonation(request, env);
  }

  return null;
}

async function getDonationClasses(env) {
  const result = await env.DB
    .prepare(
      `
      SELECT *
      FROM donation_classes
      WHERE published = 1
      ORDER BY sort_order ASC
      `
    )
    .all();

  return success(result.results);
}

async function getDonationDrives(env) {
  const result = await env.DB
    .prepare(
      `
      SELECT *
      FROM donation_drives
      WHERE published = 1
      ORDER BY date ASC
      `
    )
    .all();

  return success(result.results);
}

async function getPaymentSettings(env) {
  const settings = await env.DB
    .prepare(
      `
      SELECT *
      FROM payment_settings
      WHERE id = 1
      LIMIT 1
      `
    )
    .first();

  return success(settings);
}

async function createDonation(request, env) {
  let body;

  try {
    body = await request.json();
  } catch {
    return error("Invalid JSON request body", 400);
  }

  if (!body.class_slug) {
    return error("class_slug is required", 400);
  }

  if (!body.amount || Number(body.amount) <= 0) {
    return error("Valid donation amount is required", 400);
  }

  const id = crypto.randomUUID();

  try {
    await env.DB
      .prepare(
        `
        INSERT INTO donations (
          id,
          user_id,
          donor_name,
          donor_phone,
          class_slug,
          drive_slug,
          amount,
          method,
          upi_reference,
          note,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `
      )
      .bind(
        id,
        body.user_id || null,
        body.donor_name || null,
        body.donor_phone || null,
        body.class_slug,
        body.drive_slug || null,
        Number(body.amount),
        body.method || "upi",
        body.upi_reference || null,
        body.note || null
      )
      .run();

    return success(
      {
        id,
        status: "pending",
      },
      201
    );
  } catch (err) {
    return error(
      err instanceof Error
        ? err.message
        : "Unable to create donation",
      500
    );
  }
}