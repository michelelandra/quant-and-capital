"use client";

type Props = {
  urls?: string[];
};

function cleanUrl(raw: string) {
  return raw.trim();
}

function getPath(url: string) {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return url.toLowerCase().split("?")[0];
  }
}

function isImage(url: string) {
  return /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(
    getPath(url)
  );
}

function isVideo(url: string) {
  return /\.(mp4|webm|ogg)$/i.test(
    getPath(url)
  );
}

function isPDF(url: string) {
  return /\.pdf$/i.test(getPath(url));
}

function getYouTubeEmbed(url: string) {
  const patterns = [
    /youtube\.com\/watch\?v=([A-Za-z0-9_-]+)/i,
    /youtube\.com\/embed\/([A-Za-z0-9_-]+)/i,
    /youtu\.be\/([A-Za-z0-9_-]+)/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);

    if (match?.[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
  }

  return null;
}

function getVimeoEmbed(url: string) {
  const match = url.match(
    /vimeo\.com\/(?:video\/)?(\d+)/i
  );

  if (!match?.[1]) {
    return null;
  }

  return `https://player.vimeo.com/video/${match[1]}`;
}

export default function MediaRenderer({
  urls,
}: Props) {
  if (!urls || urls.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 space-y-5">
      {urls.map((raw, index) => {
        const url = cleanUrl(raw);

        const youtubeUrl =
          getYouTubeEmbed(url);

        const vimeoUrl =
          getVimeoEmbed(url);

        // IMAGE
        if (isImage(url)) {
          return (
            <div
              key={`${url}-${index}`}
              className="overflow-hidden rounded-xl border bg-gray-50"
            >
              <img
                src={url}
                alt={`Math Study media ${index + 1}`}
                className="w-full h-auto object-contain"
                loading="lazy"
              />
            </div>
          );
        }

        // DIRECT VIDEO
        if (isVideo(url)) {
          return (
            <div
              key={`${url}-${index}`}
              className="overflow-hidden rounded-xl border bg-black"
            >
              <video
                src={url}
                controls
                preload="metadata"
                className="w-full h-auto"
              />
            </div>
          );
        }

        // YOUTUBE / VIMEO
        if (youtubeUrl || vimeoUrl) {
          return (
            <div
              key={`${url}-${index}`}
              className="overflow-hidden rounded-xl border aspect-video"
            >
              <iframe
                src={
                  youtubeUrl ??
                  vimeoUrl ??
                  undefined
                }
                title={`Embedded video ${index + 1}`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          );
        }

        // PDF
        if (isPDF(url)) {
          return (
            <div
              key={`${url}-${index}`}
              className="border rounded-xl overflow-hidden bg-gray-50"
            >
              <div className="flex items-center justify-between gap-4 px-4 py-3 border-b bg-white">
                <div>
                  <p className="font-medium">
                    📄 PDF document
                  </p>

                  <p className="text-xs text-gray-500">
                    Attached to this Math Study
                  </p>
                </div>

                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm px-3 py-2 rounded border bg-white hover:bg-gray-50"
                >
                  Open PDF ↗
                </a>
              </div>

              <object
                data={url}
                type="application/pdf"
                className="w-full h-[650px]"
              >
                <div className="p-5">
                  <p className="text-sm text-gray-600">
                    Your browser cannot display this PDF inline.
                  </p>

                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Open the PDF
                  </a>
                </div>
              </object>
            </div>
          );
        }

        // GENERIC LINK
        return (
          <div
            key={`${url}-${index}`}
            className="border rounded-xl p-4 bg-gray-50"
          >
            <p className="text-sm font-medium mb-1">
              🔗 External resource
            </p>

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline break-all"
            >
              {url}
            </a>
          </div>
        );
      })}
    </div>
  );
}