import LandingNavigation from "@/components/LandingNavigation";
import ThemeToggle from "@/components/ThemeToggle";
import ScrollReveal from "@/components/ScrollReveal";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, Check, Flower2, Heart, Leaf, Sparkles, Sun, Wind } from "lucide-react";
import BreathingMoment from "./BreathingMoment";
import styles from "./landing.module.css";

const benefits = [
  { icon: Wind, title: "A little space to breathe", description: "Explore guided practices and make room for a quieter moment in your day." },
  { icon: Heart, title: "Connection that feels human", description: "Find a shared space for reflection and connection in the community." },
  { icon: Leaf, title: "Grow at your own pace", description: "Track your practice and return to the small rituals that feel right for you." },
];
const membershipFeatures = [
  "Full access to Home and the practice Library",
  "Daily Anchors and Daily Pauses",
  "Save your favorite practices",
  "Connect and share in the Community",
  "Mood check-ins and progress tracking",
];
const plans = [
  {
    name: "Free", price: "$0", period: " / month",
    description: "A place to begin your journey.",
    billing: "No paid membership required.", action: "Get started free",
    includes: "Your first step into presence", featured: false,
    features: ["Create your account", "Explore introductions to the app’s spaces", "Manage your profile and settings", "Upgrade to a membership when you’re ready"],
  },
  {
    name: "Monthly Membership", price: "$9.99", period: " / month",
    description: "Find your rhythm, one month at a time.",
    billing: "Billed monthly.", action: "Choose monthly",
    includes: "Everything in Free, plus:", featured: false,
    features: membershipFeatures,
  },
  {
    name: "Annual Membership", price: "$99.00", period: " / year",
    description: "Make presence part of the year ahead.",
    billing: "Billed annually. Save $20.88 vs. 12 monthly payments.", action: "Choose annual",
    includes: "All monthly membership features:", featured: true,
    features: membershipFeatures,
  },
];
const questions = [
  ["Do I need experience with meditation?", "You can begin wherever you are. Explore the library, choose a practice that feels approachable, and make space for a few moments of presence."],
  ["What’s included in a subscription?", "One subscription gives you access to Home, Library, Community, and Track in the mobile app. Monthly and yearly plans let you choose your own rhythm."],
  ["How much does membership cost?", "Start with Free at $0, choose Monthly Membership at $9.99 per month, or Annual Membership at $99.00 per year. Both paid memberships include the same features. Your app store shows the final localized price and any eligible offers before you confirm your purchase."],
  ["How do I manage my subscription?", "You can manage or cancel your subscription through the App Store or Google Play account used to subscribe. For help with your account, visit our support page."],
];

export default function LandingPage() {
  return (
    <ScrollReveal className={styles.page}>
      <a href="#main" className={styles.skip}>Skip to content</a>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="Anchor Into Presence home"><Image src="/assets/images/anchor-into-presence-logo.png" width={42} height={42} alt="" priority /><span>Anchor Into<span>Presence</span></span></Link>
        <LandingNavigation />
        <div className={styles.headerActions}><ThemeToggle /><Link href="/admin/login" className={styles.headerLogin}>Admin sign in</Link><a href="#begin" className={styles.headerCta}>Get started <ArrowRight size={16} /></a></div>
      </header>
      <main id="main">
        <section className={styles.hero} aria-labelledby="hero-heading">
          <div className={styles.heroCopy} data-reveal="left">
            <span className={styles.eyebrow}><span /> YOUR DAILY SPACE FOR WELLBEING</span>
            <h1 id="hero-heading">Find your balance.<br />One moment<br />at a time.</h1>
            <p>Make a little space for yourself with guided practices, quiet reflection, and a community to grow with. Your daily return to presence starts here.</p>
            <div className={styles.heroActions}><a href="#pricing" className={styles.primary}>Start your journey <ArrowRight size={18} /></a><a href="#experience" className={styles.textLink}>Explore the experience <ArrowDown size={16} /></a></div>

            <div className={styles.heroPathways} aria-label="Explore your practice"><strong>Find your moment</strong><a href="#experience"><Wind size={14} /> Breathe</a><a href="#experience"><Leaf size={14} /> Reflect</a><a href="#experience"><Heart size={14} /> Connect</a></div>
          </div>
          <div className={styles.heroPhoto} data-reveal="right" data-reveal-delay="120">
            <Image src="/assets/images/landing/wellness-hero.png" alt="A woman taking a quiet moment in a seated yoga stretch on a sage mat" width={1226} height={1283} sizes="(max-width: 680px) 100vw, 55vw" priority />
          </div>
        </section>
        <div className={styles.ribbon}><span><Wind size={18} /> Breathe a little deeper</span><span><Flower2 size={18} /> Feel a little more grounded</span><span><Sun size={18} /> Be a little more present</span></div>
        <section id="experience" className={styles.experience}>
          <div className={styles.sectionHeading} data-reveal="up"><span className={styles.eyebrow}>PRESENCE, IN YOUR EVERYDAY</span><h2>Small moments.<br /><em>A more connected you.</em></h2><p>You don’t need to change your whole day.<br />Just find a little room within it.</p></div>
          <div className={styles.benefits}>{benefits.map(({ icon: Icon, title, description }, index) => <article key={title} data-reveal={index === 0 ? "left" : index === 2 ? "right" : "up"} data-reveal-delay={index * 100}><span className={styles.featureNumber}>0{index + 1}</span><div className={styles.featureIcon}><Icon size={28} strokeWidth={1.25} /></div><h3>{title}</h3><p>{description}</p></article>)}</div>
        </section>
        <details className={styles.breathingPreview}>
          <summary><span><Wind size={20} /> A moment to try, right here.</span><span>Open breathing practice <ArrowDown size={16} /></span></summary>
          <div className={styles.breathingPreviewBody}><p>Let everything else wait. Follow a gentle breath at your own pace.</p><div className={styles.heroArt}><BreathingMoment /></div></div>
        </details>
        <section className={styles.practice} data-reveal><div className={styles.practiceMark}><Flower2 size={85} strokeWidth={.7} /></div><div><span className={styles.eyebrow}>YOUR PRACTICE. YOUR PACE.</span><h2>Not another thing to do.<br /><em>A moment just to be.</em></h2></div><p>From exploring the library to reflecting on your progress, Anchor Into Presence brings your practice together in one gentle space.</p></section>
        <section id="pricing" className={styles.pricing}>
          <div className={styles.sectionHeading} data-reveal="up"><span className={styles.eyebrow}>INVEST IN YOUR INNER SPACE</span><h2>A little commitment.<br /><em>Room for possibility.</em></h2><p>One space for your practice. Choose the rhythm that fits your life.</p></div>
          <div className={styles.plans}>
            {plans.map((plan, index) => (
              <article key={plan.name} data-reveal={index === 0 ? "left" : index === 2 ? "right" : "up"} data-reveal-delay={index * 100} className={`${styles.plan} ${plan.featured ? styles.yearly : ""}`}>
                <div className={styles.planIntro}>
                  <h3>{plan.name}</h3>
                  <p>{plan.description}</p>
                </div>
                <div className={styles.planPrice}><strong>{plan.price}</strong><span>{plan.period}</span></div>
                <p className={styles.billing}>{plan.billing}</p>
                <a href="#begin" className={plan.featured ? styles.primary : styles.secondary}>{plan.action}<ArrowRight size={17} aria-hidden="true" /></a>
                <p className={styles.planIncludes}><Sparkles size={18} aria-hidden="true" />{plan.includes}</p>
                <ul>{plan.features.map(feature => <li key={feature}><Check size={18} aria-hidden="true" /><span>{feature}</span></li>)}</ul>
              </article>
            ))}
          </div>
          <p className={styles.priceNote}>Paid memberships are purchased in the mobile app through the App Store or Google Play.<br />Local prices and eligible offers may vary. Review the final price and renewal terms before subscribing.</p>
        </section>
        <section id="questions" className={styles.faq}><div data-reveal="left"><span className={styles.eyebrow}>A LITTLE CLARITY</span><h2>Before you<br /><em>begin.</em></h2><p>Have another question?</p><Link href="/web/support" className={styles.textLink}>We’re here to help <ArrowRight size={16} /></Link></div><div className={styles.questions} data-reveal="right">{questions.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>
        <section id="begin" className={styles.begin} data-reveal="up"><Flower2 size={38} strokeWidth={1} /><span className={styles.eyebrow}>YOUR NEXT MOMENT STARTS HERE</span><h2>Make a little space <em>for you.</em></h2><p>Open Anchor Into Presence on your phone, then go to<br /> <strong>create your free account</strong> to get started. For full access,<br /> visit <strong>Subscription → Plans</strong> and choose a membership.</p><Link href="/web/support" className={styles.primary}>Need help getting started? <ArrowRight size={17} /></Link><span className={styles.beginNote}>Your subscription is purchased securely in the mobile app.</span></section>
      </main>
      <footer className={styles.footer}><div><Link href="/" className={styles.footerBrand}>Anchor Into Presence</Link><p>Small moments. Lasting connection.</p></div><nav aria-label="Footer navigation"><Link href="/web/privacy">Privacy</Link><Link href="/web/terms">Terms</Link><Link href="/web/support">Support</Link><Link href="/admin/login">Admin sign in <ArrowRight size={13} /></Link></nav><span>© {new Date().getFullYear()} Anchor Into Presence</span></footer>
    </ScrollReveal>
  );
}
