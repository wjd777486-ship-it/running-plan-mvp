import { useEffect, useRef } from "react";
import { TossAds } from "@apps-in-toss/web-framework";

const AD_GROUP_ID = import.meta.env.VITE_TOSS_AD_GROUP_ID as string | undefined;

export function TossAdsBanner() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!AD_GROUP_ID) return;
    if (!TossAds.attachBanner.isSupported()) return;

    const { destroy } = TossAds.attachBanner(AD_GROUP_ID, containerRef.current, {
      theme: "light",
      variant: "card",
    });

    return () => {
      destroy();
    };
  }, []);

  if (!AD_GROUP_ID) return null;

  return <div ref={containerRef} style={{ width: "100%" }} />;
}
