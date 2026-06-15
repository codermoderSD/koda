import { listCommitments } from "~/server/koda/commitments";

import { CommitmentsWorkspace } from "./commitments-workspace";

export const dynamic = "force-dynamic";

export default async function CommitmentsPage() {
  const commitments = await listCommitments();

  return <CommitmentsWorkspace commitments={commitments} />;
}
