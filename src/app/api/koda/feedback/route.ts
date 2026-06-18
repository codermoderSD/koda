import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "~/server/better-auth/server";
import { sendEmail } from "~/server/koda/gmail-actions";

const CONTACT_EMAIL = "shubham13developer@gmail.com";

const feedbackSchema = z.object({
  kind: z.enum(["credits", "product", "feedback"]).default("product"),
  message: z.string().trim().min(1).max(2000),
});

const TOPICS: Record<"credits" | "product" | "feedback", string> = {
  credits: "More AI credits request",
  product: "Product enquiry",
  feedback: "Product feedback",
};

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "You must be signed in." },
      { status: 401 },
    );
  }

  try {
    const input = feedbackSchema.parse(await request.json());
    const userEmail = session.user.email;
    const userName = session.user.name ?? userEmail;
    const topic = TOPICS[input.kind];

    const subject = `KODA, ${topic} from ${userName}`;
    const body = [
      `Topic: ${topic}`,
      `From: ${userName} <${userEmail}>`,
      "",
      input.message,
      "",
      "— Sent from the KODA workspace",
    ].join("\n");

    // Sent from the signed-in user's Gmail so replies go straight back to them.
    await sendEmail({ to: [CONTACT_EMAIL], subject, body });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not send your message.",
      },
      { status: 400 },
    );
  }
}
