import { useEffect, useMemo, useState } from "react";

export default function useImagePreload(urls) {
  const list = useMemo(() => (Array.isArray(urls) ? urls.filter(Boolean) : []), [urls]);
  const [ready, setReady] = useState(list.length === 0);

  useEffect(() => {
    let cancelled = false;

    if (!list.length) {
      setReady(true);
      return () => {};
    }

    setReady(false);
    let loaded = 0;

    const imgs = list.map((url) => {
      const img = new Image();
      img.onload = () => {
        loaded += 1;
        if (!cancelled && loaded >= list.length) setReady(true);
      };
      img.onerror = () => {
        loaded += 1;
        if (!cancelled && loaded >= list.length) setReady(true);
      };
      img.src = url;
      return img;
    });

    return () => {
      cancelled = true;
      imgs.forEach((img) => {
        img.onload = null;
        img.onerror = null;
      });
    };
  }, [list]);

  return ready;
}
