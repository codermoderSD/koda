import { getSession } from "~/server/better-auth/server";
import {
  listCommitments,
  purgeExpiredCommitments,
} from "~/server/koda/commitments";
import { getUserSettings } from "~/server/koda/settings";

import { CommitmentsWorkspace } from "./commitments-workspace";

export const dynamic = "force-dynamic";

export default async function CommitmentsPage() {
  const session = await getSession();
  const retentionDays = session
    ? (await getUserSettings(session.user.id)).commitmentRetentionDays
    : 7;
  await purgeExpiredCommitments(retentionDays);

  const commitments = await listCommitments();

  return <CommitmentsWorkspace commitments={commitments} />;
}
