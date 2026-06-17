import { InboxWorkspace } from "../inbox-workspace";

type PageProps = {
  params: Promise<{ threadId: string }>;
  searchParams?: Promise<{
    q?: string;
    tab?: string;
  }>;
};

export const dynamic = "force-dynamic";

function parseTab(value: string | undefined) {
  return value === "search" || value === "all" || value === "focused" || value === "drafts"
    ? value
    : undefined;
}

export default async function InboxThreadPage({
  params,
  searchParams,
}: PageProps) {
  const { threadId } = await params;
  const query = searchParams ? await searchParams : {};
  return (
    <InboxWorkspace
      selectedThreadId={decodeURIComponent(threadId)}
      searchQuery={query.q}
      initialTab={parseTab(query.tab)}
    />
  );
}
