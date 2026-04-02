import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertCircle, FileText, CreditCard, Mail, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Link } from "wouter";

export default function RefundPage() {
    return (
        <div className="container mx-auto px-4 py-8 space-y-8">
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto space-y-4">
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                    Refund Policy & Process
                </h1>
                <p className="text-lg text-muted-foreground">
                    We strive for transparency. While most digital sales are final, we have a clear process for resolving genuine delivery issues.
                </p>
                <div className="flex justify-center gap-4 pt-4">
                    <a href="#request-process">
                        <Button size="lg" className="gap-2">
                            <FileText className="w-4 h-4" />
                            Start Request
                        </Button>
                    </a>
                    <Link href="/contact">
                        <Button variant="outline" size="lg">
                            Contact Support
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Key Information Grid */}
            <div className="grid md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-primary" />
                            Eligibility
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-2">
                            Refunds are <strong>only</strong> issued for:
                        </p>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                <span>Non-delivery of goods</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                <span>Duplicate charges (system error)</span>
                            </li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-red-500" />
                            Non-Refundable
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-2">
                            We cannot refund:
                        </p>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-center gap-2">
                                <XCircle className="w-4 h-4 text-muted-foreground" />
                                <span>Change of mind</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <XCircle className="w-4 h-4 text-muted-foreground" />
                                <span>Accidental purchases</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <XCircle className="w-4 h-4 text-muted-foreground" />
                                <span>Used/Redeemed items</span>
                            </li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-blue-500" />
                            Timeline
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Review and processing times:
                        </p>
                        <div className="flex items-center justify-between text-sm border p-2 rounded bg-muted/50">
                            <span>Processing</span>
                            <Badge variant="secondary">5-7 Business Days</Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="process" className="w-full" id="request-process">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="process">How to Request</TabsTrigger>
                    <TabsTrigger value="faq">FAQ</TabsTrigger>
                </TabsList>

                {/* Request Process Content */}
                <TabsContent value="process" className="space-y-4">
                    <Card className="border-primary/20 bg-primary/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="w-5 h-5" />
                                Mandatory Requirements
                            </CardTitle>
                            <CardDescription>
                                To process your refund, we need proof of purchase.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-500">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Proof Required</AlertTitle>
                                <AlertDescription>
                                    Your request <strong>MUST</strong> include your <strong>Transaction ID</strong> or a clear <strong>Screenshot of the Payment</strong>. Requests without this proof will be automatically rejected.
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg">Step-by-Step Guide</h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="p-4 rounded-lg border bg-card relative">
                                        <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</div>
                                        <h4 className="font-medium mb-2 mt-2">Gather Details</h4>
                                        <p className="text-sm text-muted-foreground">Find your payment receipt (email or banking app). Note the Transaction ID.</p>
                                    </div>
                                    <div className="p-4 rounded-lg border bg-card relative">
                                        <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">2</div>
                                        <h4 className="font-medium mb-2 mt-2">Take Screenshot</h4>
                                        <p className="text-sm text-muted-foreground">Take a clear screenshot where the Amount, Date, and Merchant Name are visible.</p>
                                    </div>
                                    <div className="p-4 rounded-lg border bg-card relative">
                                        <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">3</div>
                                        <h4 className="font-medium mb-2 mt-2">Compose Email</h4>
                                        <p className="text-sm text-muted-foreground">Email us with the subject "Refund Request - [Your Username]". Attach your proof.</p>
                                    </div>
                                    <div className="p-4 rounded-lg border bg-card relative">
                                        <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">4</div>
                                        <h4 className="font-medium mb-2 mt-2">Wait for Review</h4>
                                        <p className="text-sm text-muted-foreground">Our team will verify the transaction with our payment provider within 5-7 days.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-center">
                                <Button size="lg" className="gap-2 w-full md:w-auto" asChild>
                                    <a href="mailto:contact@streamvault.live?subject=Refund Request&body=Username:%0A%0ATransaction ID:%0A%0AIssue Description:%0A%0A(Please attach screenshot)">
                                        <Mail className="w-4 h-4" />
                                        Compose Refund Email
                                    </a>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* FAQ Content */}
                <TabsContent value="faq" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Frequently Asked Questions</CardTitle>
                            <CardDescription>Common questions about our refund process</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="item-1">
                                    <AccordionTrigger>What if I don't have the Transaction ID?</AccordionTrigger>
                                    <AccordionContent className="text-muted-foreground">
                                        We cannot locate your payment without a Transaction ID or a valid receipt screenshot. Please check your banking app or email confirmation.
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="item-2">
                                    <AccordionTrigger>I bought the wrong badge, can I swap it?</AccordionTrigger>
                                    <AccordionContent className="text-muted-foreground">
                                        No. All digital item sales are final. We do not offer exchanges for accidental purchases.
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="item-3">
                                    <AccordionTrigger>How will I receive the refund?</AccordionTrigger>
                                    <AccordionContent className="text-muted-foreground">
                                        Refunds are processed back to the original payment method used for the purchase.
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="item-4">
                                    <AccordionTrigger>My account was banned, can I get a refund?</AccordionTrigger>
                                    <AccordionContent className="text-muted-foreground">
                                        No. If your account is terminated for violating our Terms of Service, you forfeit all virtual items and currencies.
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
