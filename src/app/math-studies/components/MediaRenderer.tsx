"use client";
import React from "react";

type Props = { urls?: string[] };

const isImage = (u: string) => /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(u);
const isVideo = (u: string) => /\.(mp4|webm|ogg)(\?.*)?$/i.test(u);
const isPDF   = (u: string) => /\.pdf(\?.*)?$/i.test(u);
const ytRe    = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_\-]+)/i;
const vimeoRe = /vimeo\.com\/(\d+)/i;

const yt = (u: string) => (u.match(ytRe)?.[1] ? `https://www.youtube.com/embed/${u.match(ytRe)![1]}` : null);
const vm = (u: string) => (u.match(vimeoRe)?.[1] ? `https://player.vimeo.com/video/${u.match(vimeoRe)![1]}` : null);

export default function MediaRenderer({ urls }: Props) {
  if (!urls || urls.length === 0) return null;

  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      {urls.map((raw, i) => {
        const url = encodeURI(raw.trim());
        const ytUrl = yt(url);
        const vmUrl = vm(url);

        if (isImage(url)) {
          return <img key={i} src={url} alt={`media-${i}`} className="w-full h-auto rounded-2xl border" loading="lazy" />;
        }
        if (isVideo(url)) {
          return (
            <div key={i} className="rounded-2xl border overflow-hidden">
              <video src={url} controls className="w-full h-auto" preload="metadata" />
            </div>
          );
        }
        if (ytUrl || vmUrl) {
          return (
            <div key={i} className="rounded-2xl border overflow-hidden aspect-video">
              <iframe
                src={ytUrl ?? vmUrl!}
                className="w-full h-full"
                title={`embed-${i}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          );
        }
        if (isPDF(url)) {
          return (
            <div key={i} className="rounded-2xl border overflow-hidden aspect-[4/3]">
              <iframe src={url} title={`pdf-${i}`} className="w-full h-full" />
            </div>
          );
        }
        return (
          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="underline break-all">
            {url}
          </a>
        );
      })}
    </div>
  );
}
