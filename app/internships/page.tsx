import InternshipsClient from "./InternshipsClient";

type PageProps = { searchParams: Promise<{ panel?: string }> };

export default async function InternshipsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return <InternshipsClient studentPanel={params.panel === "student"} />;
}
