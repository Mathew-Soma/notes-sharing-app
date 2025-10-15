// supabase/functions/send-share-email/index.ts
import "jsr:@std/dotenv/load"; // loads environment variables like RESEND_API_KEY

Deno.serve(async (req) => {
  try {
    const { email, noteTitle, fromUser } = await req.json();

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY in environment variables.");
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Bitwise Notes <no-reply@bitwise.com>",
        to: [email],
        subject: `${fromUser} shared a note with you`,
        html: `
          <h2>Note Shared</h2>
          <p><strong>${fromUser}</strong> has shared a note titled <strong>${noteTitle}</strong> with you.</p>
          <p>Login to your dashboard to view it.</p>
        `,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return new Response(`Failed to send email: ${text}`, { status: 500 });
    }

    return new Response("Email sent successfully!", { status: 200 });
  } catch (error) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
});
