"use client";

import ScrollReveal from "@/components/ScrollReveal";
import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Flower2, HelpCircle, LoaderCircle, MessageCircle, ShieldCheck } from "lucide-react";
import landing from "../../landing.module.css";
import styles from "./support.module.css";

export default function SupportPage() {
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const submitting = useRef(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setFeedback(null);
    if (!email.trim() || !title.trim() || !description.trim()) {
      setFeedback({ success: false, message: "Please complete all three fields before sending your message." });
      return;
    }
    submitting.current = true;
    setLoading(true);
    try {
      const response = await fetch("/api/contact-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), title: title.trim(), description: description.trim() }),
      });
      if (!response.ok) throw new Error("Your message couldn’t be sent. Please try again shortly.");
      setFeedback({ success: true, message: "Your message has been sent. Thank you for reaching out—we’ll reply to the email address you provided." });
      setEmail("");
      setTitle("");
      setDescription("");
    } catch (error) {
      setFeedback({ success: false, message: error instanceof Error && error.message.startsWith("Your message") ? error.message : "We couldn’t connect. Check your connection and try again. Your message is still here." });
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <ScrollReveal className={`${landing.page} ${styles.page}`}>
      <a href="#support-main" className={landing.skip}>Skip to content</a>
      <header className={landing.header}>
        <Link href="/" className={landing.brand} aria-label="Anchor Into Presence home"><Image src="/assets/images/anchor-into-presence-logo.png" width={42} height={42} alt="" priority /><span>Anchor Into<span>Presence</span></span></Link>
        <nav aria-label="Main navigation"><Link href="/">Home</Link><Link href="/#experience">The experience</Link><Link href="/#pricing">Pricing</Link><Link href="/web/support" className={landing.navHome} aria-current="page">Support</Link></nav>
        <div className={landing.headerActions}><Link href="/admin/login" className={landing.headerLogin}>Admin sign in</Link><Link href="/#begin" className={landing.headerCta}>Get started <ArrowRight size={16} /></Link></div>
      </header>
      <main id="support-main" className={styles.main}>
        <Link href="/" className={styles.back}><ArrowLeft size={15} /> Back to your moment</Link>
        <div className={styles.grid}>
          <section data-reveal="left" className={styles.intro} aria-labelledby="support-heading">
            <span className={landing.eyebrow}><MessageCircle size={15} /> A LITTLE SUPPORT, WHEN YOU NEED IT</span>
            <h1 id="support-heading">We’re here<br /><em>to help.</em></h1>
            <p>Sometimes a little guidance makes all the difference. Whether you have a question, need a hand, or want to share a thought, we’re listening.</p>
            <div className={styles.helpCard}><HelpCircle size={23} strokeWidth={1.5} /><div><h2>Looking for a quick answer?</h2><p>Find a little clarity on memberships, pricing, and getting started.</p><Link href="/#questions">Explore common questions <ArrowRight size={15} /></Link></div></div>
            <div className={styles.smallPrint}><Flower2 size={25} strokeWidth={1.2} /><span>Small moments. Lasting connection.</span></div>
          </section>
          <section data-reveal="right" data-reveal-delay="120" className={styles.formCard} aria-labelledby="form-heading">
            <div className={styles.formHeading}><span className={styles.icon}><MessageCircle size={23} strokeWidth={1.5} /></span><div><h2 id="form-heading">Let’s talk.</h2><p>Send a message to our support team.</p></div></div>
            <form onSubmit={handleSubmit} aria-busy={loading}>
              <div className={styles.field}><label htmlFor="support-email">Your email</label><input id="support-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={event => setEmail(event.target.value)} required disabled={loading} aria-describedby="email-help" /><small id="email-help">We’ll use this address to reply to you.</small></div>
              <div className={styles.field}><label htmlFor="support-title">What can we help with?</label><input id="support-title" name="title" type="text" placeholder="Give your message a short title" value={title} onChange={event => setTitle(event.target.value)} required disabled={loading} /></div>
              <div className={styles.field}><label htmlFor="support-description">Your message</label><textarea id="support-description" name="description" rows={6} placeholder="Tell us a little more about what’s on your mind…" value={description} onChange={event => setDescription(event.target.value)} required disabled={loading} /></div>
              {feedback && <div className={`${styles.feedback} ${feedback.success ? styles.success : styles.error}`} role={feedback.success ? "status" : "alert"}>{feedback.success && <CheckCircle2 size={19} />}<p>{feedback.message}</p></div>}
              <button type="submit" disabled={loading} className={styles.submit}>{loading ? <><LoaderCircle className={styles.spinner} size={18} /> Sending your message…</> : <>Send message <ArrowRight size={18} /></>}</button>
              <p className={styles.privacy}><ShieldCheck size={15} /> Your information is handled according to our <Link href="/web/privacy">Privacy Policy</Link>.</p>
            </form>
          </section>
        </div>
      </main>
      <footer className={landing.footer}><div><Link href="/" className={landing.footerBrand}>Anchor Into Presence</Link><p>Small moments. Lasting connection.</p></div><nav aria-label="Footer navigation"><Link href="/web/privacy">Privacy</Link><Link href="/web/terms">Terms</Link><Link href="/web/support" aria-current="page">Support</Link></nav><span>© {new Date().getFullYear()} Anchor Into Presence</span></footer>
    </ScrollReveal>
  );
}
