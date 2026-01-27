import React from "react";

export default function ItemCard({ imageUrl, title, subtitle, meta }) {
  return (
    <article className="ui-card ui-card--pattern overflow-hidden">
      <div className="aspect-[16/9] w-full" style={{ background: "color-mix(in srgb, var(--surface-2) 80%, transparent)" }}>
        <img
          src={imageUrl}
          alt={title}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="p-4">
        <div className="ui-title text-base font-bold">{title}</div>
        <div className="mt-1 text-sm ui-muted">{subtitle}</div>
        {meta ? <div className="mt-2 text-xs font-extrabold ui-muted">{meta}</div> : null}
      </div>
    </article>
  );
}
