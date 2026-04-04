import { Mail, AlertTriangle, ShieldAlert } from "lucide-react";
import { SEO } from "@/components/seo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function DMCA() {
  return (
    <div className="min-h-screen">
      <SEO
        title="DMCA Policy"
        description="StreamVault's DMCA policy. Learn how to report copyright infringement and our process for handling takedown requests."
        canonical="https://streamvault.live/dmca"
      />
      <div className="container mx-auto px-4 py-12 max-w-4xl space-y-10">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <Badge variant="outline" className="mb-4 bg-primary/10 border-primary/20 text-primary px-4 py-1">
            Copyright Policy
          </Badge>
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center shadow-lg shadow-primary/20">
              <ShieldAlert className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            DMCA Policy
          </h1>
          <p className="text-lg text-muted-foreground pt-2">
            StreamVault respects intellectual property rights. Learn about our takedown process.
          </p>
        </div>

        {/* Content Card */}
        <Card className="border-border/50 bg-card/60 backdrop-blur-sm shadow-xl text-left overflow-hidden">
          <CardContent className="p-8 md:p-12">
            <div className="prose prose-invert max-w-none space-y-8">
              <p className="text-muted-foreground font-medium border-b border-border/50 pb-4">
                Last updated: {new Date().toLocaleDateString()}
              </p>

              <div className="p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex flex-col sm:flex-row gap-4 items-start shadow-md shadow-yellow-500/5">
                <div className="bg-yellow-500/20 p-2 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-yellow-500">Important Notice</h3>
                  <p className="text-sm text-yellow-500/90 leading-relaxed">
                    StreamVault respects the intellectual property rights of others and expects its users to do the same.
                    We respond to notices of alleged copyright infringement that comply with the Digital Millennium Copyright Act (DMCA).
                  </p>
                </div>
              </div>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">Copyright Infringement Notice</h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you believe that your copyrighted work has been copied in a way that constitutes copyright
                  infringement and is accessible on StreamVault, please notify our copyright agent as set forth below.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">DMCA Takedown Request</h2>
                <p className="text-muted-foreground leading-relaxed">
                  For your complaint to be valid under the DMCA, you must provide the following information in writing:
                </p>
                <ol className="list-decimal pl-6 space-y-3 text-muted-foreground marker:text-primary">
                  <li>
                    <strong className="text-foreground">Identification of the copyrighted work:</strong> A description of the copyrighted work
                    that you claim has been infringed.
                  </li>
                  <li>
                    <strong className="text-foreground">Location of infringing material:</strong> The URL or other specific location on StreamVault
                    where the material you claim is infringing is located.
                  </li>
                  <li>
                    <strong className="text-foreground">Your contact information:</strong> Your name, address, telephone number, and email address.
                  </li>
                  <li>
                    <strong className="text-foreground">Good faith statement:</strong> A statement that you have a good faith belief that the
                    disputed use is not authorized by the copyright owner, its agent, or the law.
                  </li>
                  <li>
                    <strong className="text-foreground">Accuracy statement:</strong> A statement, made under penalty of perjury, that the above
                    information in your notice is accurate and that you are the copyright owner or authorized to act
                    on the copyright owner's behalf.
                  </li>
                  <li>
                    <strong className="text-foreground">Physical or electronic signature:</strong> An electronic or physical signature of the
                    person authorized to act on behalf of the owner of the copyright interest.
                  </li>
                </ol>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">How to Submit a DMCA Notice</h2>
                <div className="p-6 bg-card border border-border/50 rounded-xl shadow-md">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Mail className="w-6 h-6 text-primary flex-shrink-0" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold mb-2 text-foreground">Copyright Agent Contact</h3>
                      <p className="mb-3 text-muted-foreground">Send your formal DMCA notice to:</p>
                      <div className="space-y-2 text-sm bg-background p-4 rounded-lg border border-border/50 font-mono">
                        <p><strong className="text-primary mr-2">Email:</strong> <a href="mailto:contact@streamvault.live" className="text-foreground hover:text-primary transition-colors">contact@streamvault.live</a></p>
                        <p><strong className="text-primary mr-2">Subject:</strong> DMCA Takedown Request</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground pt-4 border-t border-border/50 text-center">
                    Please allow <strong className="text-foreground">24-48 hours</strong> for us to process your request.
                  </p>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">Counter-Notification</h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you believe that your content was removed by mistake or misidentification, you may file a
                  counter-notification with us. To be effective, a counter-notification must include:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground marker:text-primary">
                  <li>Your physical or electronic signature</li>
                  <li>Identification of the material that has been removed and the location where it appeared</li>
                  <li>A statement under penalty of perjury that you have a good faith belief that the material was removed as a result of mistake or misidentification</li>
                  <li>Your name, address, and telephone number</li>
                  <li>A statement that you consent to the jurisdiction of the federal court in your district</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">Repeat Infringer Policy</h2>
                <p className="text-muted-foreground leading-relaxed">
                  In accordance with the DMCA and other applicable law, StreamVault has adopted a policy of
                  terminating, in appropriate circumstances, users who are deemed to be repeat infringers.
                  A user who receives three or more DMCA notices within any 12-month period may have their
                  account permanently suspended without prior notice.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">Safe Harbor</h2>
                <p className="text-muted-foreground leading-relaxed">
                  StreamVault qualifies for Section 512(c) Safe Harbor protection under the DMCA as a service 
                  provider that stores content at the direction of users and expeditiously removes infringing 
                  content upon proper notification. We do not receive direct financial benefit specifically 
                  attributable to infringing activity, and we have no actual knowledge of infringement until 
                  properly notified.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">DMCA Process Timeline</h2>
                <div className="space-y-3">
                  <div className="flex gap-4 items-start p-4 bg-muted/30 border border-border/50 rounded-lg">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">1</div>
                    <div><strong className="text-foreground">Submit Notice</strong><p className="text-sm text-muted-foreground mt-1">Send a compliant DMCA takedown notice to our copyright agent via email with all required information.</p></div>
                  </div>
                  <div className="flex gap-4 items-start p-4 bg-muted/30 border border-border/50 rounded-lg">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">2</div>
                    <div><strong className="text-foreground">Review (24–48 hours)</strong><p className="text-sm text-muted-foreground mt-1">Our team reviews the notice for compliance and identifies the infringing content.</p></div>
                  </div>
                  <div className="flex gap-4 items-start p-4 bg-muted/30 border border-border/50 rounded-lg">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">3</div>
                    <div><strong className="text-foreground">Content Removal</strong><p className="text-sm text-muted-foreground mt-1">We remove or disable access to the infringing material and notify the relevant user.</p></div>
                  </div>
                  <div className="flex gap-4 items-start p-4 bg-muted/30 border border-border/50 rounded-lg">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">4</div>
                    <div><strong className="text-foreground">Counter-Notification Window</strong><p className="text-sm text-muted-foreground mt-1">The user has 10-14 business days to file a counter-notification if they believe removal was in error.</p></div>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">Content Hosting Disclaimer</h2>
                <p className="text-muted-foreground leading-relaxed">
                  StreamVault does not host any video content on its servers. All content is embedded from
                  third-party sources such as Google Drive and other video hosting platforms. We act as a search
                  engine and aggregator of publicly available content.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  If you are a copyright owner and believe that content accessible through StreamVault infringes
                  your copyright, please contact us immediately with a proper DMCA notice, and we will remove
                  the links to the infringing content.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">Response Time</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We take copyright infringement seriously and will respond to all valid DMCA notices within
                  24-48 hours. Upon receiving a valid notice, we will:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground marker:text-primary">
                  <li>Remove or disable access to the allegedly infringing material</li>
                  <li>Notify the user who posted the material</li>
                  <li>Provide the user with a copy of the DMCA notice</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">False Claims</h2>
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-5">
                  <p className="text-muted-foreground leading-relaxed italic">
                    Please note that under Section 512(f) of the DMCA, any person who knowingly materially
                    misrepresents that material or activity is infringing may be subject to liability for damages.
                  </p>
                </div>
              </section>

              <section className="mt-12 p-6 bg-primary/5 border border-primary/20 rounded-xl">
                <h3 className="text-xl font-bold mb-3 text-primary">Need Help?</h3>
                <p className="mb-4 text-muted-foreground leading-relaxed">
                  If you have questions about our DMCA policy or need assistance with filing a notice,
                  please contact us through our{" "}
                  <a href="/contact" className="text-foreground font-medium hover:text-primary transition-colors underline">contact page</a>.
                </p>
                <p className="text-sm text-primary/80 italic">
                  We are committed to protecting intellectual property rights and will work with copyright
                  owners to resolve any issues promptly.
                </p>
              </section>

            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
