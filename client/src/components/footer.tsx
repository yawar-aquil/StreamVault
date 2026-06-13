import { Link, useLocation } from "wouter";
import { Instagram, Twitter, Send, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from "@/components/language-selector";

import { AdContainer } from "@/components/ad-manager";

export function Footer() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const [location] = useLocation();

  // Hide footer on specific routes
  if (location.startsWith("/watch-together") || location.startsWith("/watch-rooms") || location.startsWith("/room")) {
    return null;
  }

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Subscribed!",
          description: data.message || "You've been added to our newsletter.",
        });
        setEmail("");
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to subscribe",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to subscribe. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickLinks = [
    { name: t('footer.browse'), path: "/browse" },
    { name: t('nav.anime'), path: "/anime" },
    { name: t('footer.blog'), path: "/blog" },
    { name: t('footer.about'), path: "/about" },
    { name: t('footer.contact'), path: "/contact" },
    { name: t('footer.sitemap'), path: "/sitemap" },
    { name: t('footer.terms'), path: "/terms" },
    { name: t('footer.privacy'), path: "/privacy" },
    { name: t('footer.dmca'), path: "/dmca" },
  ];

  const categories = [
    { name: t('categories.action'), path: "/category/action" },
    { name: t('categories.drama'), path: "/category/drama" },
    { name: t('categories.comedy'), path: "/category/comedy" },
    { name: t('categories.thriller'), path: "/category/thriller" },
    { name: t('categories.romance'), path: "/category/romance" },
  ];

  const support = [
    { name: t('support.help'), path: "/help" },
    { name: t('support.faq'), path: "/faq" },
    { name: t('support.report'), path: "/report" },
    { name: t('support.request'), path: "/request" },
    { name: "Store", path: "/store" },
    { name: "Referral Program", path: "/referral-program" },
    { name: "Refund Policy", path: "/refund" },
    { name: t('support.api'), path: "/api-docs" },
  ];

  return (
    <footer className="border-t border-border bg-card mt-20 overflow-hidden">
      <AdContainer type="footer" className="mb-8" />
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-12 mb-12">
          {/* Quick Links */}
          <div className="col-span-1">
            <h3 className="font-semibold mb-4 text-primary">{t('footer.quickLinks')}</h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.path}>
                  <Link href={link.path}>
                    <span
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      data-testid={`link-footer-${link.name.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {link.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div className="col-span-1">
            <h3 className="font-semibold mb-4 text-primary">{t('footer.categories')}</h3>
            <ul className="space-y-3">
              {categories.map((category) => (
                <li key={category.path}>
                  <Link href={category.path}>
                    <span
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      data-testid={`link-footer-category-${category.name.toLowerCase()}`}
                    >
                      {category.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div className="col-span-1">
            <h3 className="font-semibold mb-4 text-primary">{t('footer.support')}</h3>
            <ul className="space-y-3">
              {support.map((item) => (
                <li key={item.path}>
                  <Link href={item.path}>
                    <span
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      data-testid={`link-footer-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {item.name}
                    </span>
                  </Link>
                </li>
              ))}
                <li key="feedback">
                  <span
                    onClick={() => window.dispatchEvent(new Event('open-feedback-modal'))}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    data-testid="link-footer-feedback"
                  >
                    Feedback
                  </span>
                </li>
                <li key="join-team-initiative">
                  <span
                    onClick={() => window.dispatchEvent(new Event('open-join-team-modal'))}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer flex items-center gap-1.5"
                    data-testid="link-footer-join-team-modal"
                  >
                    Join Team <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span></span>
                  </span>
                </li>
            </ul>
          </div>

          {/* Social & Newsletter */}
          <div className="col-span-2 md:col-span-1 pt-6 md:pt-0 border-t border-border md:border-0">
            <h3 className="font-semibold mb-4 text-primary">{t('footer.stayConnected')}</h3>

            {/* Social Icons */}
            <div className="flex flex-wrap gap-2 mb-6">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300"
                asChild
                data-testid="button-social-twitter"
              >
                <a
                  href="https://twitter.streamvault.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="X (Twitter)"
                >
                  <Twitter className="h-4 w-4" />
                </a>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300"
                asChild
                data-testid="button-social-instagram"
              >
                <a
                  href="https://instagram.streamvault.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                >
                  <Instagram className="h-4 w-4" />
                </a>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300"
                asChild
                data-testid="button-social-telegram"
              >
                <a
                  href="https://telegram.streamvault.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Telegram"
                >
                  <Send className="h-4 w-4" />
                </a>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300"
                asChild
                data-testid="button-social-facebook"
              >
                <a
                  href="https://facebook.streamvault.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                >
                  <Facebook className="h-4 w-4" />
                </a>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300"
                asChild
                data-testid="button-social-whatsapp"
              >
                <a
                  href="https://whatsapp.streamvault.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp channel"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path
                      fill="currentColor"
                      d="M20.52 3.48A11.77 11.77 0 0 0 12 0 11.94 11.94 0 0 0 .24 11.76 11.74 11.74 0 0 0 2.4 18.6L0 24l5.64-2.4A12.06 12.06 0 0 0 12 24h.01A11.93 11.93 0 0 0 24 12a11.8 11.8 0 0 0-3.48-8.52ZM12 21.8h-.01a9.76 9.76 0 0 1-4.98-1.37l-.36-.21-3.35 1.43L4 18.5l-.24-.38A9.77 9.77 0 0 1 2.2 12 9.8 9.8 0 0 1 12 2.2 9.72 9.72 0 0 1 21.8 12 9.78 9.78 0 0 1 12 21.8Zm5.36-7.34c-.29-.14-1.7-.84-1.96-.94s-.45-.14-.64.14-.74.94-.9 1.13-.33.21-.62.07a7.95 7.95 0 0 1-2.34-1.44 8.77 8.77 0 0 1-1.62-2.01c-.17-.29 0-.45.13-.59.14-.14.29-.33.43-.5s.19-.29.29-.48a.52.52 0 0 0 0-.5c-.07-.14-.64-1.54-.88-2.12s-.45-.48-.64-.48h-.54a1 1 0 0 0-.74.35 3.12 3.12 0 0 0-.97 2.31 5.46 5.46 0 0 0 1.14 2.91 12.5 12.5 0 0 0 4.79 4.26 5.5 5.5 0 0 0 3.29.69 2.79 2.79 0 0 0 1.86-1.31 2.27 2.27 0 0 0 .16-1.31c-.07-.14-.26-.21-.55-.35Z"
                    />
                  </svg>
                </a>
              </Button>
            </div>

            {/* Newsletter */}
            <form onSubmit={handleNewsletterSubmit} className="space-y-3">
              <label className="text-sm text-muted-foreground block">
                {t('footer.subscribe')}
              </label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-background/50 backdrop-blur"
                  data-testid="input-newsletter-email"
                />
                <Button
                  type="submit"
                  data-testid="button-newsletter-submit"
                  disabled={isSubmitting}
                  className="transition-all active:scale-95"
                >
                  {isSubmitting ? "..." : "Join"}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground z-10 relative">
          <p>{t('footer.copyright')}</p>
          <div className="flex items-center gap-4">
            <LanguageSelector />
            <p className="hidden md:block">{t('footer.tagline')}</p>
          </div>
        </div>
      </div>

      {/* Giant StreamVault Typography Effect */}
      <div className="w-full flex justify-center items-end overflow-visible pt-16 pb-8 select-none mt-4 cursor-default">
        <div className="flex text-[12vw] leading-[0.8] font-black tracking-tighter uppercase">
          {"STREAMVAULT".split("").map((char, i) => {
            const isRed = i % 2 === 0;
            return (
              <span
                key={i}
                className={`text-foreground/10 transition-all duration-200 ease-out hover:-translate-y-6 hover:scale-[1.15] ${
                  isRed 
                    ? "hover:text-primary hover:drop-shadow-[0_0_20px_hsl(var(--primary)/0.6)]" 
                    : "hover:text-foreground hover:drop-shadow-[0_0_20px_hsl(var(--foreground)/0.5)]"
                }`}
              >
                {char}
              </span>
            );
          })}
        </div>
      </div>
    </footer>
  );
}
