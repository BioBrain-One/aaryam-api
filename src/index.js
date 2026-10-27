import {
  json,
  error,
  optionsResponse,
} from "./utils/response.js";

import { authRoutes } from "./routes/auth.js";
import { profileRoutes } from "./routes/profile.js";
import { chantsRoutes } from "./routes/chants.js";
import { ritualsRoutes } from "./routes/rituals.js";
import { panchangRoutes } from "./routes/panchang.js";
import { festivalsRoutes } from "./routes/festivals.js";
import { eventsRoutes } from "./routes/events.js";
import { donationsRoutes } from "./routes/donations.js";
import { practiceRoutes } from "./routes/practice.js";
import { aiRoutes } from "./routes/ai.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS
    if (request.method === "OPTIONS") {
      return optionsResponse("*");
    }

    // Health check
    if (
      url.pathname === "/" ||
      url.pathname === "/api/health"
    ) {
      return json({
        success: true,
        message: "Aaryam API is healthy",
      });
    }

    // Database test
    if (url.pathname === "/api/db-test") {
      try {
        const result = await env.DB
          .prepare("SELECT 1 AS connected")
          .first();

        return json({
          success: true,
          database: "aaryam-db",
          result,
        });
      } catch (err) {
        return error(
          err instanceof Error
            ? err.message
            : "Database connection failed",
          500
        );
      }
    }

    // Routes
    const routes = [
      authRoutes,
      profileRoutes,
      chantsRoutes,
      ritualsRoutes,
      panchangRoutes,
      festivalsRoutes,
      eventsRoutes,
      donationsRoutes,
      practiceRoutes,
      aiRoutes,
    ];

    for (const route of routes) {
      const response = await route(
        request,
        env,
        url
      );

      if (response) {
        return response;
      }
    }

    return error(
      `Endpoint not found: ${url.pathname}`,
      404
    );
  },
};