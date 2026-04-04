import { SEO } from "@/components/seo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Scale } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen">
      <SEO 
        title="Terms of Service"
        description="Read StreamVault's Terms of Service. Understand your rights and responsibilities when using our free streaming platform."
        canonical="https://streamvault.live/terms"
      />
      <div className="container mx-auto px-4 py-12 max-w-4xl space-y-10">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <Badge variant="outline" className="mb-4 bg-primary/10 border-primary/20 text-primary px-4 py-1">
            Legal Document
          </Badge>
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center shadow-lg shadow-primary/20">
              <Scale className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            Terms of Service
          </h1>
          <p className="text-lg text-muted-foreground pt-2">
            Understand your rights and responsibilities when using our free streaming platform.
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
                <h2 className="text-2xl font-bold text-foreground">1. Acceptance of Terms</h2>
                <p className="text-muted-foreground leading-relaxed">
                  By accessing and using StreamVault ("the Service"), you accept and agree to be bound by the terms 
                  and provision of this agreement. If you do not agree to abide by the above, please do not use this service. 
                  These Terms apply to all visitors, users, and others who access or use the Service.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">2. Description of Service</h2>
                <p className="text-muted-foreground leading-relaxed">
                  StreamVault is a free streaming aggregator that indexes and links to publicly available content 
                  from third-party sources. We do not host, upload, or store any video content on our servers. 
                  The platform provides a user interface to discover, organize, and access content embedded from 
                  external providers. Features include watchlists, watch history, community forums, watch parties, 
                  gamification, and a developer API.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">3. User Accounts & Registration</h2>
                <p className="text-muted-foreground leading-relaxed">
                  While StreamVault can be used without an account, registering provides additional benefits such 
                  as cross-device syncing, community participation, the referral program, and gamification features. 
                  When creating an account, you agree to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground marker:text-primary">
                  <li>Provide accurate, current, and complete registration information</li>
                  <li>Maintain the security of your password and accept responsibility for all activities under your account</li>
                  <li>Promptly notify us of any unauthorized use of your account</li>
                  <li>Not create accounts using automated means or false identities</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed">
                  We reserve the right to suspend or terminate accounts that violate these terms.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">4. Age Restrictions</h2>
                <div className="p-5 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-muted-foreground leading-relaxed">
                    StreamVault is intended for users who are at least <strong className="text-foreground">13 years of age</strong>. 
                    If you are under 13, you may not use the Service. Users between 13 and 18 years of age 
                    must have parental or guardian consent. By using this Service, you represent that you meet 
                    these age requirements.
                  </p>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">5. Use License</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Permission is granted to temporarily access the materials on StreamVault for personal, 
                  non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, 
                  and under this license you may not:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground marker:text-primary">
                  <li>Modify or copy the materials</li>
                  <li>Use the materials for any commercial purpose or for any public display</li>
                  <li>Attempt to reverse engineer any software contained on StreamVault</li>
                  <li>Remove any copyright or other proprietary notations from the materials</li>
                  <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
                  <li>Scrape, crawl, or use bots to collect data from the platform without prior written permission</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">6. User Conduct</h2>
                <p className="text-muted-foreground leading-relaxed">You agree to use StreamVault only for lawful purposes. You agree not to:</p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground marker:text-primary">
                  <li>Upload, post, or transmit any content that is illegal, harmful, or offensive</li>
                  <li>Impersonate any person or entity or misrepresent your affiliation with any entity</li>
                  <li>Interfere with or disrupt the service or servers connected to the service</li>
                  <li>Attempt to gain unauthorized access to any portion of the service</li>
                  <li>Use any automated means to access the service without prior written permission</li>
                  <li>Harass, threaten, or intimidate other users of the platform</li>
                  <li>Post spam, chain letters, or unsolicited promotional materials in community areas</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">7. Third-Party Content & Links</h2>
                <p className="text-muted-foreground leading-relaxed">
                  StreamVault provides access to streaming content by embedding it from third-party sources. 
                  We do not host any content on our servers. We are not responsible for the content, 
                  availability, accuracy, or legality of third-party sources. The inclusion of any 
                  third-party link or embed does not imply our endorsement of that source.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">8. Advertising</h2>
                <p className="text-muted-foreground leading-relaxed">
                  StreamVault is a free service supported by advertising, including Google AdSense and similar 
                  networks. By using the Service, you acknowledge that advertising may be displayed. 
                  Ad-free experiences may be available through premium features on supported domains. 
                  We are not responsible for the content of third-party advertisements.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">9. Browser Extension</h2>
                <p className="text-muted-foreground leading-relaxed">
                  StreamVault offers an optional browser extension that integrates with external streaming 
                  services to show StreamVault alternatives and quick-access buttons. By installing the extension, you agree that:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground marker:text-primary">
                  <li>The extension may inject interface elements into third-party websites you visit</li>
                  <li>The extension only reads page data necessary for its features and does not collect private information</li>
                  <li>You can uninstall the extension at any time through your browser's extension manager</li>
                  <li>The extension is provided "as is" and may be updated or discontinued at our discretion</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">10. Intellectual Property</h2>
                <p className="text-muted-foreground leading-relaxed">
                  All original platform content displayed on StreamVault, including but not limited to text, 
                  graphics, logos, interface designs, and software code, is the property of StreamVault or 
                  its content suppliers and is protected by copyright and intellectual property laws. 
                  Third-party media content remains the property of the respective right holders.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">11. Disclaimer</h2>
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-5">
                  <p className="text-muted-foreground leading-relaxed italic">
                    The materials on StreamVault are provided on an 'as is' basis. StreamVault makes no warranties, 
                    expressed or implied, and hereby disclaims and negates all other warranties including, without 
                    limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, 
                    or non-infringement of intellectual property or other violation of rights.
                  </p>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">12. Limitations of Liability</h2>
                <p className="text-muted-foreground leading-relaxed">
                  In no event shall StreamVault or its suppliers be liable for any damages (including, without 
                  limitation, damages for loss of data or profit, or due to business interruption) arising out 
                  of the use or inability to use the materials on StreamVault, even if StreamVault has been 
                  notified of the possibility of such damage.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">13. Indemnification</h2>
                <p className="text-muted-foreground leading-relaxed">
                  You agree to indemnify, defend, and hold harmless StreamVault, its officers, directors, 
                  employees, and agents from and against any claims, liabilities, damages, losses, and expenses, 
                  including without limitation reasonable attorney's fees, arising out of or in any way connected 
                  with your access to or use of the Service, your violation of these Terms, or your violation 
                  of any third-party rights.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">14. Modifications to Service & Terms</h2>
                <p className="text-muted-foreground leading-relaxed">
                  StreamVault may revise these terms of service or modify, suspend, or discontinue any aspect 
                  of the Service at any time without notice. By continuing to use the Service after any changes, 
                  you agree to be bound by the updated Terms.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">15. Termination</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We reserve the right to terminate or suspend access to our service immediately, without prior 
                  notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. 
                  Upon termination, your right to use the Service will cease immediately.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">16. Governing Law</h2>
                <p className="text-muted-foreground leading-relaxed">
                  These terms and conditions are governed by and construed in accordance with applicable laws. 
                  Any disputes relating to these Terms shall be subject to the exclusive jurisdiction of 
                  the competent courts in the applicable jurisdiction.
                </p>
              </section>

              <section className="space-y-4 mt-8 pt-8 border-t border-border/50">
                <h2 className="text-2xl font-bold text-foreground">17. Contact Information</h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you have any questions about these Terms, please contact us at{" "}
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
