export async function GET({ url }) {
  const id = url.searchParams.get('id') || 'lacanau';
  try {
    const res = await fetch(`http://localhost:4001/cam?id=${id}`);
    const html = await res.text();
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  } catch {
    return new Response('Webcam indisponible', { status: 502 });
  }
}
