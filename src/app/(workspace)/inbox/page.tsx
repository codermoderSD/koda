import { InboxWorkspace } from "./inbox-workspace";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    q?: string;
    tab?: string;
    threadId?: string;
  }>;
};

function parseTab(value: string | undefined) {
  return value === "search" || value === "all" || value === "focused" || value === "drafts"
    ? value
    : undefined;
}

export default async function WorkspacePage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  return (
    <InboxWorkspace
      selectedThreadId={
        params.threadId ? decodeURIComponent(params.threadId) : undefined
      }
      searchQuery={params.q}
      initialTab={parseTab(params.tab)}
    />
  );
}
