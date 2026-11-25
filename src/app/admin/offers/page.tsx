"use client";

import { useState } from "react";
import Image from "next/image";
import { RefreshCw } from "lucide-react";
import type { StoreEnvironment } from "@/lib/appStoreOffers";
import shared from "../users/users.module.css";
import styles from "./offers.module.css";
import AppleSubscribersReport from "./AppleSubscribersReport";
import GoogleOffersReport from "./GoogleOffersReport";
import GoogleSubscribersReport from "./GoogleSubscribersReport";

export default function PromotionalOffersPage() {
  const [platform, setPlatform] = useState<"apple" | "google">("apple");
  const [view, setView] = useState<"subscribers" | "offers">("subscribers");
  return <>
    <div className={styles.platforms} role="group" aria-label="Store platform">
      <button type="button" aria-pressed={platform === "apple"} onClick={() => setPlatform("apple")}><Image src="/assets/images/apple-icon.svg" alt="" width={18} height={20} aria-hidden="true" />Apple App Store</button>
      <button type="button" aria-pressed={platform === "google"} onClick={() => setPlatform("google")}><Image src="/assets/images/google-icon.svg" alt="" width={18} height={20} aria-hidden="true" />Google Play</button>
    </div>
    <>
      <div className={styles.platforms} role="group" aria-label={`${platform === "apple" ? "Apple" : "Google"} report`}>
        <button type="button" aria-pressed={view === "subscribers"} onClick={() => setView("subscribers")}>Subscribers</button>
        <button type="button" aria-pressed={view === "offers"} onClick={() => setView("offers")}>Promotional offers</button>
      </div>
      {platform === "apple"
        ? view === "subscribers" ? <AppleSubscribersReport /> : <AppleOffersReport />
        : view === "subscribers" ? <GoogleSubscribersReport /> : <GoogleOffersReport />}
    </>
  </>;
}

function AppleOffersReport() {
  const [environment, setEnvironment] = useState<StoreEnvironment>("production");
  const [refresh, setRefresh] = useState(0);
  return <div className={shared.page}>
    <div className={shared.heading}>
      <div><p className={shared.eyebrow}>Apple App Store</p><h1>Promotional offers</h1><p className={shared.subtitle}>Subscribers with offers checked directly with Apple.</p></div>
      <div className={styles.controls}>
        <label htmlFor="store-environment">App Store environment<select id="store-environment" value={environment} onChange={event => setEnvironment(event.target.value as StoreEnvironment)}><option value="production">Production</option><option value="sandbox">Sandbox</option></select></label>
        <button type="button" className={styles.reviewButton} onClick={() => setRefresh(value => value + 1)}><RefreshCw size={16} aria-hidden="true" />Refresh</button>
      </div>
    </div>
    <AppleSubscribersReport key={environment} offersOnly environment={environment} refreshKey={refresh} />
  </div>;
}
