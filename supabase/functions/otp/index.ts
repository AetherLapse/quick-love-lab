/**
 * OTP Edge Function — send and verify one-time codes for email/phone
 *
 * Required Supabase secrets:
 *   OTP_SECRET          — random string used to sign tokens (set any long random value)
 *   RESEND_API_KEY      — from https://resend.com (for email OTP)
 *   FROM_EMAIL          — sender address registered in Resend (e.g. noreply@yourdomain.com)
 *   TWILIO_ACCOUNT_SID  — from https://twilio.com (for SMS OTP)
 *   TWILIO_AUTH_TOKEN   — Twilio auth token
 *   TWILIO_FROM_NUMBER  — Twilio phone number in E.164 format (e.g. +12025551234)
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = await req.json();
    const { action } = body;
    const otpSecret = Deno.env.get("OTP_SECRET") ?? "change-me-in-supabase-secrets";

    // ── SEND ──────────────────────────────────────────────────────────────────
    if (action === "send") {
      const { contact, type, dancer_name } = body as {
        contact: string;
        type: "email" | "phone";
        dancer_name?: string;
      };

      if (!contact || !type) return json({ error: "contact and type required" }, 400);

      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expires = Date.now() + 10 * 60 * 1000; // 10 min

      const hmac = await hmacHex(otpSecret, `${contact}:${code}:${expires}`);
      const payload = btoa(JSON.stringify({ contact, type, expires }));
      const token = `${payload}.${hmac}`;

      if (type === "email") {
        const resendKey = Deno.env.get("RESEND_API_KEY");
        if (!resendKey) {
          return json({ error: "Email service not configured — set RESEND_API_KEY in Supabase secrets." }, 503);
        }

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: Deno.env.get("FROM_EMAIL") ?? "onboarding@resend.dev",
            to: contact,
            subject: "Your 2NYT verification code",
            html: `
              <div style="font-family:sans-serif;max-width:420px;margin:0 auto;padding:24px;background:#0a0a0a;color:#fff;border-radius:12px">
                <h2 style="color:#b8952d;margin-top:0">2NYT Venue Management</h2>
                <p style="color:#aaa">Hello${dancer_name ? ` ${dancer_name}` : ""},</p>
                <p>Your verification code is:</p>
                <div style="font-size:40px;font-weight:bold;letter-spacing:12px;text-align:center;padding:24px;background:#1a1a1a;border-radius:8px;margin:20px 0;color:#b8952d">
                  ${code}
                </div>
                <p style="color:#666;font-size:13px">This code expires in 10 minutes. Do not share it with anyone.</p>
              </div>
            `,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { message?: string }).message ?? "Failed to send email");
        }
      } else if (type === "phone") {
        const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
        const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
        const fromNumber = Deno.env.get("TWILIO_FROM_NUMBER");

        if (!accountSid || !authToken || !fromNumber) {
          return json(
            { error: "SMS service not configured — set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER in Supabase secrets." },
            503,
          );
        }

        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              To: contact,
              From: fromNumber,
              Body: `Your 2NYT verification code is: ${code}. Expires in 10 minutes.`,
            }),
          },
        );

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { message?: string }).message ?? "Failed to send SMS");
        }
      } else {
        return json({ error: "type must be 'email' or 'phone'" }, 400);
      }

      return json({ token });

    // ── VERIFY ────────────────────────────────────────────────────────────────
    } else if (action === "verify") {
      const { token, code } = body as { token: string; code: string };
      if (!token || !code) return json({ error: "token and code required" }, 400);

      const dotIdx = token.lastIndexOf(".");
      if (dotIdx === -1) return json({ valid: false, reason: "Invalid token" });

      const payloadB64 = token.slice(0, dotIdx);
      const hmac = token.slice(dotIdx + 1);

      let contact: string, expires: number;
      try {
        ({ contact, expires } = JSON.parse(atob(payloadB64)));
      } catch {
        return json({ valid: false, reason: "Malformed token" });
      }

      if (Date.now() > expires) {
        return json({ valid: false, reason: "Code expired" });
      }

      const expectedHmac = await hmacHex(otpSecret, `${contact}:${code}:${expires}`);
      return json({ valid: expectedHmac === hmac });

    } else {
      return json({ error: "action must be 'send' or 'verify'" }, 400);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return json({ error: msg }, 500);
  }
});
