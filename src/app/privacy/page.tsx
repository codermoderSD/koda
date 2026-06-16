import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "../_components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy | KODA",
  description:
    "How KODA collects, uses, stores, and protects Google Gmail and Calendar data.",
};

const updatedAt = "June 16, 2026";

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      description="This policy explains how KODA handles account information, Gmail data, Google Calendar data, OAuth tokens, analytics, and AI-assisted processing."
      updatedAt={updatedAt}
      sections={[
        {
          title: "Who we are",
          body: (
            <>
              <p>
                KODA is an email and calendar execution workspace available at{" "}
                <Link href="https://koda.shubhamdalvi.in">
                  koda.shubhamdalvi.in
                </Link>
                . For privacy questions, account deletion, or data requests,
                contact{" "}
                <a href="mailto:shubham13developer@gmail.com">
                  shubham13developer@gmail.com
                </a>
                .
              </p>
            </>
          ),
        },
        {
          title: "Information we collect",
          body: (
            <>
              <p>
                When you sign in with Google, KODA receives your Google account
                profile information such as your name, email address, and user
                identifier.
              </p>
              <p>
                If you grant access, KODA may process Gmail and Google Calendar
                data needed to provide the product, including message metadata,
                message snippets or body content, recipients, labels, threads,
                calendar event titles, event times, attendees, and related
                scheduling details.
              </p>
              <p>
                KODA stores OAuth tokens and refresh tokens so it can keep your
                workspace synchronized after you sign in. KODA also stores
                derived workspace data, such as commitments, follow-ups,
                deadlines, drafts, action history, and sync status.
              </p>
              <p>
                KODA uses Vercel Analytics to understand basic site usage. This
                may include page views, device/browser information, referrers,
                and approximate region data.
              </p>
            </>
          ),
        },
        {
          title: "How we use your information",
          body: (
            <>
              <p>KODA uses your information to:</p>
              <ul>
                <li>Authenticate your account and maintain your session.</li>
                <li>Display, search, and summarize relevant Gmail threads.</li>
                <li>
                  Extract commitments, deadlines, owners, and follow-up actions
                  from email context.
                </li>
                <li>
                  Display, create, update, or delete Google Calendar events when
                  you request those actions.
                </li>
                <li>
                  Draft or send Gmail messages only when you request or confirm
                  those actions.
                </li>
                <li>
                  Maintain security, debugging, abuse prevention, and logs.
                </li>
              </ul>
            </>
          ),
        },
        {
          title: "Google API data and limited use",
          body: (
            <>
              <p>
                KODA uses Google user data only to provide and improve
                user-facing email, calendar, scheduling, drafting, search, and
                commitment-tracking features.
              </p>
              <p>
                KODA does not sell Google user data. KODA does not use Google
                user data for advertising. KODA does not allow humans to read
                your Google user data unless you ask for support, it is needed
                for security or abuse investigation, or it is required by law.
              </p>
              <p>
                KODA may send the minimum relevant Gmail or Calendar context to
                infrastructure and AI service providers solely to operate the
                requested product features, such as extracting commitments,
                drafting replies, or answering your workspace questions. KODA
                does not use Google user data to train generalized AI models.
              </p>
              <p>
                KODA&apos;s use and transfer of information received from Google
                APIs adheres to the{" "}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  rel="noreferrer"
                  target="_blank"
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements.
              </p>
            </>
          ),
        },
        {
          title: "Sharing and service providers",
          body: (
            <>
              <p>
                KODA shares data with service providers only as needed to run
                the application. These providers may include hosting, analytics,
                database, authentication, email/calendar integration, and
                AI-processing infrastructure.
              </p>
              <p>
                KODA may disclose information if required by law, to protect the
                rights and security of users or the service, or as part of a
                business transfer where privacy commitments continue to apply.
              </p>
            </>
          ),
        },
        {
          title: "Retention and deletion",
          body: (
            <>
              <p>
                KODA keeps account, token, email, calendar, and derived
                workspace data for as long as needed to provide the service,
                maintain security, comply with legal obligations, and resolve
                disputes.
              </p>
              <p>
                You can revoke KODA&apos;s Google access at any time from your
                Google Account permissions page. You may also request account
                deletion or deletion of stored KODA data by contacting{" "}
                <a href="mailto:shubham13developer@gmail.com">
                  shubham13developer@gmail.com
                </a>
                .
              </p>
            </>
          ),
        },
        {
          title: "Security",
          body: (
            <>
              <p>
                KODA uses reasonable technical and organizational safeguards to
                protect account data, OAuth tokens, and workspace data. No
                internet service can guarantee absolute security.
              </p>
            </>
          ),
        },
        {
          title: "Changes",
          body: (
            <>
              <p>
                KODA may update this Privacy Policy as the service changes. The
                updated policy will be posted on this page with a new effective
                date.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
