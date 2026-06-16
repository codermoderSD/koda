import type { Metadata } from "next";

import { LegalPage } from "../_components/legal-page";

export const metadata: Metadata = {
  title: "Terms and Conditions | KODA",
  description: "Terms for using KODA, the email and calendar execution layer.",
};

const updatedAt = "June 16, 2026";

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms and Conditions"
      description="These terms govern access to and use of KODA. By using KODA, you agree to these terms."
      updatedAt={updatedAt}
      sections={[
        {
          title: "Use of KODA",
          body: (
            <>
              <p>
                KODA helps users manage Gmail, Google Calendar, commitments,
                follow-ups, scheduling, drafting, and related workflow actions.
                You may use KODA only if you can legally enter into these terms
                and comply with applicable laws.
              </p>
              <p>
                You are responsible for maintaining access to your Google
                account and for all activity performed through your KODA
                workspace.
              </p>
            </>
          ),
        },
        {
          title: "Google account connection",
          body: (
            <>
              <p>
                KODA uses Google OAuth to connect to Gmail and Google Calendar.
                You control whether to grant or revoke access. KODA can only
                perform actions permitted by the scopes you approve.
              </p>
              <p>
                Some KODA features require Gmail or Calendar access. If you
                revoke access, those features may stop working until you
                reconnect your account.
              </p>
            </>
          ),
        },
        {
          title: "User instructions and actions",
          body: (
            <>
              <p>
                KODA may draft emails, create calendar events, schedule
                follow-ups, or perform other workspace actions based on your
                instructions. You are responsible for reviewing important
                outputs before relying on them.
              </p>
              <p>
                You agree not to use KODA to send spam, violate another
                person&apos;s rights, access data without permission, or perform
                unlawful, harmful, deceptive, or abusive activity.
              </p>
            </>
          ),
        },
        {
          title: "AI-assisted features",
          body: (
            <>
              <p>
                KODA includes AI-assisted features for extraction, drafting,
                search, summaries, and workflow assistance. AI output may be
                incomplete, inaccurate, or inappropriate for your specific
                situation.
              </p>
              <p>
                KODA is not a substitute for professional advice. You are
                responsible for decisions you make using KODA output.
              </p>
            </>
          ),
        },
        {
          title: "Privacy",
          body: (
            <>
              <p>
                The KODA Privacy Policy explains how account data, Google user
                data, analytics data, and workspace data are collected, used,
                stored, and shared. By using KODA, you also agree to the Privacy
                Policy.
              </p>
            </>
          ),
        },
        {
          title: "Availability and changes",
          body: (
            <>
              <p>
                KODA may change, suspend, or discontinue features at any time.
                KODA may also update these terms by posting a new version on
                this page.
              </p>
              <p>
                KODA may be offered as an early-stage or experimental service.
                Features may contain bugs, sync delays, or incomplete data.
              </p>
            </>
          ),
        },
        {
          title: "Disclaimers",
          body: (
            <>
              <p>
                KODA is provided on an as-is and as-available basis. To the
                fullest extent permitted by law, KODA disclaims warranties of
                merchantability, fitness for a particular purpose,
                non-infringement, availability, accuracy, and reliability.
              </p>
            </>
          ),
        },
        {
          title: "Limitation of liability",
          body: (
            <>
              <p>
                To the fullest extent permitted by law, KODA will not be liable
                for indirect, incidental, special, consequential, exemplary, or
                punitive damages, or for lost profits, lost revenue, lost data,
                business interruption, or goodwill loss.
              </p>
            </>
          ),
        },
        {
          title: "Termination",
          body: (
            <>
              <p>
                You may stop using KODA at any time and revoke Google access
                from your Google Account permissions page. KODA may suspend or
                terminate access if you violate these terms, create risk for the
                service, or use the service unlawfully.
              </p>
            </>
          ),
        },
        {
          title: "Contact",
          body: (
            <>
              <p>
                Questions about these terms can be sent to{" "}
                <a href="mailto:shubham13developer@gmail.com">
                  shubham13developer@gmail.com
                </a>
                .
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
