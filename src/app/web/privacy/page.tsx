import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Meditation Application",
};

/**
 * Fetches privacy policy content from API.
 */
async function getPrivacy() {
  const res = await fetch(`${process.env.BASE_URL}/api/content/privacy`, {
    cache: "no-store",
  });

  if (!res.ok) throw new Error("Failed to fetch privacy policy");
  return res.json();
}

/**
 * Public Privacy Policy Page
 */
export default async function PrivacyPage() {
  const { data } = await getPrivacy();

  return (
    <main className="mx-auto max-w-4xl px-6 py-12 text-slate-800">
      <article
        className="prose mt-6"
        dangerouslySetInnerHTML={{ __html: data?.description || "" }}
      />
    </main>
  );
}
