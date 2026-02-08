
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export function EditBadgeDialog({ badge, open, onOpenChange }: { badge: any, open: boolean, onOpenChange: (open: boolean) => void }) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [name, setName] = useState(badge.name);
    const [description, setDescription] = useState(badge.description);
    const [imageUrl, setImageUrl] = useState(badge.imageUrl || "");
    const [category, setCategory] = useState(badge.category);

    // Store fields
    const [price, setPrice] = useState(badge.price || 0);
    const [stock, setStock] = useState(badge.stock?.toString() || "");
    const [isForSale, setIsForSale] = useState(badge.isForSale || false);
    const [giftable, setGiftable] = useState(badge.giftable ?? true);
    const [limited, setLimited] = useState(badge.limited || false);
    const [isSpecial, setIsSpecial] = useState(badge.isSpecial || false);
    const [displayPriority, setDisplayPriority] = useState(badge.displayPriority || 0);

    // Reset form when badge changes
    useEffect(() => {
        setName(badge.name);
        setDescription(badge.description);
        setImageUrl(badge.imageUrl || "");
        setCategory(badge.category);
        setPrice(badge.price || 0);
        setStock(badge.stock != null ? badge.stock.toString() : "");
        setIsForSale(badge.isForSale || false);
        setGiftable(badge.giftable ?? true);
        setLimited(badge.limited || false);
        setIsSpecial(badge.isSpecial || false);
        setDisplayPriority(badge.displayPriority || 0);
    }, [badge]);

    const updateMutation = useMutation({
        mutationFn: async () => {
            const body = {
                name,
                description,
                imageUrl,
                category,
                price: parseInt(price as any),
                stock: stock === "" ? null : parseInt(stock),
                isForSale,
                giftable,
                limited,
                isSpecial,
                displayPriority: parseInt(displayPriority as any)
            };

            const res = await fetch(`/api/admin/badges/${badge.id}`, {
                method: "PATCH",
                headers: {
                    ...getAuthHeaders(),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to update badge");
            }
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Success", description: "Badge updated successfully" });
            onOpenChange(false);
            queryClient.invalidateQueries({ queryKey: ["/api/badges"] });
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Badge</DialogTitle>
                    <DialogDescription>Update badge details and store settings</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Badge Name</Label>
                                <Input value={name} onChange={(e) => setName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="general">General</SelectItem>
                                        <SelectItem value="achievement">Achievement</SelectItem>
                                        <SelectItem value="challenge">Challenge</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Image URL (SVG/PNG)</Label>
                            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
                        </div>

                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Store Settings</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-4 p-4 border rounded-lg">
                                <div className="flex items-center justify-between">
                                    <Label className="flex-1 cursor-pointer" htmlFor="is-for-sale">List for Sale</Label>
                                    <Switch id="is-for-sale" checked={isForSale} onCheckedChange={setIsForSale} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="flex-1 cursor-pointer" htmlFor="limited">Limited Edition</Label>
                                    <Switch id="limited" checked={limited} onCheckedChange={setLimited} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="flex-1 cursor-pointer" htmlFor="is-special">Special (VIP/Effect)</Label>
                                    <Switch id="is-special" checked={isSpecial} onCheckedChange={setIsSpecial} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="flex-1 cursor-pointer" htmlFor="giftable">Giftable</Label>
                                    <Switch id="giftable" checked={giftable} onCheckedChange={setGiftable} />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Price (cents)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={price}
                                        onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                                        className="bg-card"
                                    />
                                    <p className="text-xs text-muted-foreground">${(Number(price) / 100).toFixed(2)}</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Stock (Empty = Unlimited)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={stock}
                                        onChange={(e) => setStock(e.target.value)}
                                        placeholder="Unlimited"
                                        className="bg-card"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Display Priority (Higher first)</Label>
                                    <Input
                                        type="number"
                                        value={displayPriority}
                                        onChange={(e) => setDisplayPriority(parseInt(e.target.value) || 0)}
                                        className="bg-card"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
