// POST /api/lock: ends case-study access. Called by every page outside the case studies (js/site.js),
// including ones the browser showed from its own memory or a prerender, which never reach the server.
import { clearCookie } from "../_access.js";

export const onRequestPost = () => new Response(null, { status: 204, headers: { "Set-Cookie": clearCookie, "Cache-Control": "no-store" } });
