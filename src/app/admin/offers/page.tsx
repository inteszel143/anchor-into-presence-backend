"use client";

import { useState } from "react";
import Image from "next/image";
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
  return <div className={shared.page}><AppleSubscribersReport offersOnly /></div>;
}
