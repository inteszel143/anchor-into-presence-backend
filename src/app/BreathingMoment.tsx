"use client";

import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";
import styles from "./landing.module.css";

export default function BreathingMoment() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setStep(value => value + 1), 4000);
    return () => clearInterval(timer);
  }, [active]);
  const breatheIn = step % 2 === 0;
  return <div className={styles.breathing}>
    <span className={styles.breathingOverline}>FOLLOW YOUR BREATH</span>
    <div className={`${styles.breathCircle} ${active ? breatheIn ? styles.inhale : styles.exhale : ""}`}><span aria-live="polite">{active ? breatheIn ? "Breathe in" : "Breathe out" : "Just breathe."}</span><small>{active ? "Slowly, gently, at your own pace" : "A little space. Just for you."}</small></div>
    <button type="button" aria-pressed={active} onClick={() => { setStep(0); setActive(value => !value); }}>{active ? <Pause size={14} /> : <Play size={14} />} {active ? "Pause this moment" : "Try a breathing moment"}</button>
  </div>;
}
