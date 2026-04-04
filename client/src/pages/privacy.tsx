import { SEO } from "@/components/seo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen">
      <SEO 
        title="Privacy Policy"
        description="Learn how StreamVault collects, uses, and protects your personal information. We value your privacy and are committed to transparency."
        canonical="https://streamvault.live/privacy"
      />
      <div className="container mx-auto px-4 py-12 max-w-4xl space-y-10">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <Badge variant="outline" className="mb-4 bg-primary/10 border-primary/20 text-primary px-4 py-1">
            Privacy
          </Badge>
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center shadow-lg shadow-primary/20">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          <p className="text-lg text-muted-foreground pt-2">
            Learn how StreamVault collects, uses, and protects your personal information.
          </p>
        </div>

        {/* Content Card */}
        <Card className="border-border/50 bg-card/60 backdrop-blur-sm shadow-xl text-left overflow-hidden">
          <CardContent className="p-8 md:p-12">
            <div className="prose prose-invert max-w-none space-y-8">
              <p className="text-muted-foreground font-medium border-b border-border/50 pb-4">
                Last updated: April 4, 2025
              </p>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">1. Introduction</h2>
                <p className="text-muted-foreground leading-relaxed">
                  StreamVault ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy 
                  explains how we collect, use, disclose, and safeguard your information when you visit our website 
                  or use our services. Please read this policy carefully. If you disagree with its terms, please 
                  discontinue use of the site.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">2. Information We Collect</h2>
                <p className="text-muted-foreground leading-relaxed">
                  StreamVault collects minimal information to provide you with the best streaming experience:
                </p>
                <div className="space-y-3">
                  <div className="p-4 bg-muted/30 border border-border/50 rounded-lg">
                    <strong className="text-foreground block mb-1">Information You Provide Directly:</strong>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-sm">
                      <li>Username and email address when creating an account</li>
                      <li>Profile information such as avatar and bio (optional)</li>
                      <li>Content submitted in comments, community posts, and feedback forms</li>
                      <li>Content request submissions via the contact form</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-muted/30 border border-border/50 rounded-lg">
                    <strong className="text-foreground block mb-1">Automatically Collected Information:</strong>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-sm">
                      <li>Browser type and version, operating system</li>
                      <li>IP address (used for analytics only, not stored permanently)</li>
                      <li>Pages visited and time spent on the site</li>
                      <li>Referring URLs (how you found us)</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-muted/30 border border-border/50 rounded-lg">
                    <strong className="text-foreground block mb-1">Locally Stored Data (Your Device Only):</strong>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-sm">
                      <li>Viewing history and watch progress (stored in browser localStorage)</li>
                      <li>Watchlist preferences and saved items</li>
                      <li>Theme and display preferences</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">3. How We Use Your Information</h2>
                <p className="text-muted-foreground leading-relaxed">We use the collected information to:</p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground marker:text-primary">
                  <li>Provide, maintain, and improve the StreamVault platform and its features</li>
                  <li>Manage user accounts and enable cross-device syncing for registered users</li>
                  <li>Remember your watch progress, watchlist, and preferences</li>
                  <li>Provide personalized content recommendations</li>
                  <li>Send service-related notifications (account updates, security alerts)</li>
                  <li>Analyze site traffic and usage patterns to improve performance</li>
                  <li>Detect and prevent fraud, abuse, and security incidents</li>
                  <li>Comply with legal obligations</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed">
                  We do <strong className="text-foreground">not</strong> sell your personal information to third parties.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">4. Cookies and Tracking</h2>
                <p className="text-muted-foreground leading-relaxed">
                  StreamVault uses cookies and similar tracking technologies to enhance your experience:
                </p>
                <div className="grid gap-3 mt-4">
                  <div className="p-4 bg-muted/30 border border-border/50 rounded-lg">
                    <strong className="text-foreground">Essential Cookies:</strong> <span className="text-muted-foreground">Required for basic site functionality such as authentication and security. Cannot be disabled.</span>
                  </div>
                  <div className="p-4 bg-muted/30 border border-border/50 rounded-lg">
                    <strong className="text-foreground">Analytics Cookies:</strong> <span className="text-muted-foreground">Google Analytics to understand user behavior, popular content, and site performance. Data is anonymized and aggregated.</span>
                  </div>
                  <div className="p-4 bg-muted/30 border border-border/50 rounded-lg">
                    <strong className="text-foreground">Advertising Cookies:</strong> <span className="text-muted-foreground">Google AdSense and similar networks to display relevant advertisements. These cookies are set by third-party ad providers.</span>
                  </div>
                  <div className="p-4 bg-muted/30 border border-border/50 rounded-lg">
                    <strong className="text-foreground">Preference Cookies:</strong> <span className="text-muted-foreground">Remember your settings such as theme (dark/light mode) and language preferences across sessions.</span>
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  You can control cookies through your browser settings. Note that disabling cookies may affect 
                  certain features of the Service.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">5. Third-Party Services</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We use the following third-party services that may collect information about you:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground marker:text-primary">
                  <li><strong className="text-foreground">Google Analytics:</strong> Web analytics to understand traffic and usage</li>
                  <li><strong className="text-foreground">Google AdSense:</strong> Advertising network for displaying relevant ads</li>
                  <li><strong className="text-foreground">Cloudflare:</strong> Content delivery network, DDoS protection, and bot detection (Turnstile)</li>
                  <li><strong className="text-foreground">TMDB API:</strong> Third-party movie and TV show metadata (The Movie Database)</li>
                  <li><strong className="text-foreground">Socket.IO:</strong> Real-time communication for Watch Together rooms and live features</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed">
                  Each of these services has its own privacy policy. We encourage you to review their policies 
                  to understand how they handle your data.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">6. Data Retention</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We retain your data for as long as your account is active or as needed to provide our services. 
                  Specifically:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground marker:text-primary">
                  <li>Account data is retained until you request account deletion</li>
                  <li>Watch history and locally stored data is controlled entirely by you and can be cleared through your browser settings at any time</li>
                  <li>Server-side analytics data is retained for up to 26 months, after which it is anonymized or deleted</li>
                  <li>Support communications are retained for up to 2 years for quality assurance</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">7. Your Rights & Choices</h2>
                <p className="text-muted-foreground leading-relaxed">
                  You have certain rights regarding the personal information we hold about you:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground marker:text-primary">
                  <li><strong className="text-foreground">Access:</strong> Request a copy of the personal data we hold about you</li>
                  <li><strong className="text-foreground">Correction:</strong> Request that we correct inaccurate or incomplete data</li>
                  <li><strong className="text-foreground">Deletion:</strong> Request that we delete your account and associated data</li>
                  <li><strong className="text-foreground">Portability:</strong> Request a machine-readable copy of your data</li>
                  <li><strong className="text-foreground">Opt-out:</strong> Opt out of marketing communications at any time</li>
                  <li><strong className="text-foreground">Object:</strong> Object to processing of your data in certain circumstances</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed">
                  To exercise these rights, contact us at{" "}
                  <a href="mailto:contact@streamvault.live" className="text-primary hover:underline">contact@streamvault.live</a>.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">8. GDPR & CCPA Compliance</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-5 bg-muted/30 border border-border/50 rounded-lg space-y-2">
                    <h3 className="font-bold text-foreground">For EU Users (GDPR)</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      If you are located in the European Economic Area, you have rights under the General Data 
                      Protection Regulation (GDPR). Our legal basis for processing your information includes 
                      your consent, performance of a contract, our legitimate interests, and legal compliance.
                    </p>
                  </div>
                  <div className="p-5 bg-muted/30 border border-border/50 rounded-lg space-y-2">
                    <h3 className="font-bold text-foreground">For California Users (CCPA)</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      California residents have additional rights under the California Consumer Privacy Act 
                      (CCPA), including the right to know what personal data is collected and the right to 
                      opt out of the sale of personal information. We do not sell personal information.
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">9. Children's Privacy</h2>
                <div className="p-5 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-muted-foreground leading-relaxed">
                    StreamVault is not intended for children under the age of 13. We do not knowingly collect 
                    personal information from children under 13. If you are a parent or guardian and believe 
                    your child has provided us with personal information, please contact us immediately at{" "}
                    <a href="mailto:contact@streamvault.live" className="text-primary hover:underline">contact@streamvault.live</a>{" "}
                    and we will take steps to delete that information.
                  </p>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">10. Security</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We implement appropriate technical and organizational security measures to protect your 
                  personal information against unauthorized access, alteration, disclosure, or destruction. 
                  These measures include encrypted connections (HTTPS), secure password hashing, and 
                  regular security reviews. However, no method of transmission over the Internet is 100% secure, 
                  and we cannot guarantee absolute security.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">11. Changes to This Policy</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may update this Privacy Policy from time to time. We will notify you of any changes by 
                  posting the new Privacy Policy on this page and updating the "Last updated" date. 
                  You are advised to review this Privacy Policy periodically for any changes. Changes are 
                  effective when they are posted on this page.
                </p>
              </section>

              <section className="space-y-4 mt-8 pt-8 border-t border-border/50">
                <h2 className="text-2xl font-bold text-foreground">12. Contact Us</h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you have questions about this Privacy Policy or our privacy practices, please contact us at:{" "}
                  <a href="mailto:contact@streamvault.live" className="text-primary font-medium hover:underline">contact@streamvault.live</a>{" "}
                  or through our{" "}
                  <a href="/contact" className="text-primary font-medium hover:underline">contact page</a>.
                </p>
              </section>

            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
