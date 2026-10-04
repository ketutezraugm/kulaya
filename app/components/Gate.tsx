"use client";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useOwner } from "@/components/ShopProvider";
import { Art, Button, Skel } from "@/components/ui";
import * as scene from "@/components/art/scene";
import * as mascot from "@/components/art/mascot";
import type { Shop } from "@/lib/shop";
import { t } from "@/lib/copy";

type Owner = ReturnType<typeof useOwner>;

/** Waits for wallet + shop data and sends visitors to the right place: not signed in -> /masuk, not registered -> /mulai. */
export function Gate({ children }: { children: (o: Owner & { shop: Shop; viewer: NonNullable<Owner["viewer"]> }) => ReactNode }) {
  const o = useOwner();
  const r = useRouter();
  const { ready, viewer, shop } = o;
  useEffect(() => { if (ready && !viewer) r.replace("/masuk"); }, [ready, viewer, r]);
  useEffect(() => { if (shop && !shop.registered) r.replace("/mulai"); }, [shop, r]);
  if (!ready || !viewer || !shop || !shop.registered) {
    return (
      <main className="shell-main" aria-busy="true" data-testid="loading">
        {o.error && shop === null && ready && viewer ? (
          <div className="stack-lg center" style={{ paddingTop: 24 }}>
            <Art svg={scene.illStateSlow} w={220} />
            <h1 className="h2">{t("err.slow.title")}</h1>
            <p className="p">{t("err.slow.body")}</p>
            <Button onClick={o.reload}>{t("err.retry")}</Button>
          </div>
        ) : (
          <div className="stack-lg" style={{ paddingTop: 24 }}>
            <div className="row" style={{ gap: 12 }}><Art svg={mascot.mascotThink} w={56} /><p className="small">{t("err.loading")}</p></div>
            <Skel h={140} /><Skel h={120} /><Skel h={80} />
          </div>
        )}
      </main>
    );
  }
  return <>{children({ ...o, shop, viewer })}</>;
}
