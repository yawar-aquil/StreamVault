import { Mail, MessageSquare, HelpCircle, Twitter, Instagram, Send, Facebook } from "lucide-react";
import { SEO } from "@/components/seo";

export default function Contact() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Contact Us"
        description="Get in touch with StreamVault. Have questions, feedback, or need support? We're here to help you 24/7."
        canonical="https://streamvault.live/contact"
      />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
          <p className="text-xl text-muted-foreground mb-12">
            Have questions or feedback? We're here to help!
          </p>

          {/* Contact Options */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="text-center p-6 rounded-lg bg-card border border-border">
              <div className="flex justify-center mb-4">
                <Mail className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Email Us</h3>
              <p className="text-muted-foreground mb-4">
                Send us an email and we'll respond within 24-48 hours.
              </p>
              <a
                href="mailto:streamvault.live@gmail.com"
                className="text-primary hover:underline"
              >
                streamvault.live@gmail.com
              </a>
            </div>

            <div className="text-center p-6 rounded-lg bg-card border border-border">
              <div className="flex justify-center mb-4">
                <MessageSquare className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Feedback</h3>
              <p className="text-muted-foreground mb-4">
                Share your thoughts and help us improve StreamVault.
              </p>
              <a
                href="mailto:streamvault.live@gmail.com"
                className="text-primary hover:underline"
              >
                streamvault.live@gmail.com
              </a>
            </div>

            <div className="text-center p-6 rounded-lg bg-card border border-border">
              <div className="flex justify-center mb-4">
                <HelpCircle className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Support</h3>
              <p className="text-muted-foreground mb-4">
                Need help? Our support team is ready to assist you.
              </p>
              <a
                href="mailto:streamvault.live@gmail.com"
                className="text-primary hover:underline"
              >
                streamvault.live@gmail.com
              </a>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-6">Frequently Asked Questions</h2>
            <div className="space-y-4">
              <div className="p-6 rounded-lg bg-card border border-border">
                <h3 className="text-xl font-semibold mb-2">Is StreamVault really free?</h3>
                <p className="text-muted-foreground">
                  Yes! StreamVault is completely free to use. We're supported by advertisements to keep the service free for everyone.
                </p>
              </div>

              <div className="p-6 rounded-lg bg-card border border-border">
                <h3 className="text-xl font-semibold mb-2">Do I need to create an account?</h3>
                <p className="text-muted-foreground">
                  No account is required! Your watch progress and watchlist are saved locally in your browser.
                </p>
              </div>

              <div className="p-6 rounded-lg bg-card border border-border">
                <h3 className="text-xl font-semibold mb-2">Can I request a show or movie?</h3>
                <p className="text-muted-foreground">
                  Absolutely! Send us an email with your request and we'll do our best to add it to our library.
                </p>
              </div>

              <div className="p-6 rounded-lg bg-card border border-border">
                <h3 className="text-xl font-semibold mb-2">Why isn't a video playing?</h3>
                <p className="text-muted-foreground">
                  Try refreshing the page or clearing your browser cache. If the problem persists, please contact our support team.
                </p>
              </div>

              <div className="p-6 rounded-lg bg-card border border-border">
                <h3 className="text-xl font-semibold mb-2">How often is new content added?</h3>
                <p className="text-muted-foreground">
                  We regularly update our library with new episodes and shows. Check back often for the latest content!
                </p>
              </div>
            </div>
          </div>

          {/* Business Inquiries */}
          <div className="p-8 rounded-lg bg-card border border-border">
            <h2 className="text-2xl font-bold mb-4">Business Inquiries</h2>
            <p className="text-muted-foreground mb-4">
              For partnerships, advertising, or other business opportunities, please contact:
            </p>
            <a
              href="mailto:streamvault.live@gmail.com"
              className="text-primary hover:underline text-lg font-semibold"
            >
              streamvault.live@gmail.com
            </a>
          </div>

          {/* Social Links */}
          <div className="p-8 rounded-lg bg-card border border-border mt-8">
            <h2 className="text-2xl font-bold mb-4">Follow Us</h2>
            <p className="text-muted-foreground mb-6">
              Stay connected with us on social media for updates and announcements.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="https://x.streamvault.in"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background border border-border hover:border-primary transition-colors"
              >
                <Twitter className="w-5 h-5 text-primary" />
                <span>X (Twitter)</span>
              </a>
              <a
                href="https://instagram.streamvault.in"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background border border-border hover:border-primary transition-colors"
              >
                <Instagram className="w-5 h-5 text-primary" />
                <span>Instagram</span>
              </a>
              <a
                href="https://telegram.streamvault.in"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background border border-border hover:border-primary transition-colors"
              >
                <Send className="w-5 h-5 text-primary" />
                <span>Telegram</span>
              </a>
              <a
                href="https://facebook.streamvault.in"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background border border-border hover:border-primary transition-colors"
              >
                <Facebook className="w-5 h-5 text-primary" />
                <span>Facebook</span>
              </a>
              <a
                href="https://whatsapp.streamvault.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background border border-border hover:border-primary transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="w-5 h-5 text-primary"
                  aria-hidden="true"
                >
                  <path
                    fill="currentColor"
                    d="M20.52 3.48A11.77 11.77 0 0 0 12 0 11.94 11.94 0 0 0 .24 11.76 11.74 11.74 0 0 0 2.4 18.6L0 24l5.64-2.4A12.06 12.06 0 0 0 12 24h.01A11.93 11.93 0 0 0 24 12a11.8 11.8 0 0 0-3.48-8.52ZM12 21.8h-.01a9.76 9.76 0 0 1-4.98-1.37l-.36-.21-3.35 1.43L4 18.5l-.24-.38A9.77 9.77 0 0 1 2.2 12 9.8 9.8 0 0 1 12 2.2 9.72 9.72 0 0 1 21.8 12 9.78 9.78 0 0 1 12 21.8Zm5.36-7.34c-.29-.14-1.7-.84-1.96-.94s-.45-.14-.64.14-.74.94-.9 1.13-.33.21-.62.07a7.95 7.95 0 0 1-2.34-1.44 8.77 8.77 0 0 1-1.62-2.01c-.17-.29 0-.45.13-.59.14-.14.29-.33.43-.5s.19-.29.29-.48a.52.52 0 0 0 0-.5c-.07-.14-.64-1.54-.88-2.12s-.45-.48-.64-.48h-.54a1 1 0 0 0-.74.35 3.12 3.12 0 0 0-.97 2.31 5.46 5.46 0 0 0 1.14 2.91 12.5 12.5 0 0 0 4.79 4.26 5.5 5.5 0 0 0 3.29.69 2.79 2.79 0 0 0 1.86-1.31 2.27 2.27 0 0 0 .16-1.31c-.07-.14-.26-.21-.55-.35Z"
                  />
                </svg>
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
