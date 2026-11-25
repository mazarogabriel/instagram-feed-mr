export function optimizedMediaUrl(
  source: string,
  width = 1200,
  quality = 75
): string {
  return (
    "/_next/image?url=" +
    encodeURIComponent(source) +
    "&w=" +
    width +
    "&q=" +
    quality
  );
}
