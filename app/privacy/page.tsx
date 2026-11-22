import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy policy | SocialFlow AI",
  description: "How SocialFlow AI uses account, media, and publishing data.",
};

export default function PrivacyPolicyPage() {
  const configuredEmail = process.env.PRIVACY_CONTACT_EMAIL?.trim();
  const contact = configuredEmail && /^[^\s@?#:]+@[^\s@?#:]+\.[^\s@?#:]+$/.test(configuredEmail) ? configuredEmail : undefined;

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <Link href="/" className="text-sm underline underline-offset-4">SocialFlow AI home</Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">Privacy policy</h1>
      <p className="mt-4 text-muted-foreground">
        SocialFlow AI helps you create, review, schedule, and publish content to the social accounts you connect.
      </p>
      <div className="mt-8 space-y-7 text-sm leading-relaxed sm:text-base">
        <section aria-labelledby="account-data">
          <h2 id="account-data" className="mb-2 text-xl font-semibold">Account and connection data</h2>
          <p>
            We use your email address and profile details to sign you in and operate your workspace. When you connect a
            social account, we store the account identifier, name, granted permissions, and encrypted authorization
            tokens. We use these permissions to verify your connection, publish to destinations you select, and retrieve
            metrics where available.
          </p>
        </section>
        <section aria-labelledby="content-data">
          <h2 id="content-data" className="mb-2 text-xl font-semibold">Media, captions, and publishing</h2>
          <p>
            SocialFlow AI stores the media, drafts, captions, schedules, and publishing records you create. When you use
            caption generation, Google Gemini receives relevant text and images or representative video frames. When
            you publish or enable automatic publishing, we send the content to the social platform you selected.
            Supabase provides database and media storage, and Vercel hosts the web application.
          </p>
        </section>
        <section aria-labelledby="data-choices">
          <h2 id="data-choices" className="mb-2 text-xl font-semibold">Disconnecting and deleting data</h2>
          <p>
            You can disconnect a provider in <Link href="/dashboard/accounts" className="underline">Social accounts</Link>.
            Disconnecting clears the stored authorization tokens for that connection. Drafts and publishing history remain
            in your workspace. You can remove unused uploads from the media library.
          </p>
          <p className="mt-3">
            To request access to or deletion of your workspace data, contact{" "}
            {contact ? <a className="underline" href={"mailto:" + contact}>{contact}</a> : "the administrator who provides your SocialFlow AI workspace"}.
            Include the email address you use to sign in so the administrator can verify the request.
          </p>
        </section>
      </div>
    </main>
  );
}
