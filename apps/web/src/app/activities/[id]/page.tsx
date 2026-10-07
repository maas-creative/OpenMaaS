import Detail from '@/components/platform/detail';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let decoded = id;
  try {
    decoded = decodeURIComponent(id);
  } catch {}
  return <Detail id={decoded} />;
}
