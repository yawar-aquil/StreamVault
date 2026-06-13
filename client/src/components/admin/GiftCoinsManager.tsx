import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Search, Gift, Users, CheckSquare, Square, Loader2 } from "lucide-react";
import { getAuthHeaders } from "@/lib/auth";
import { RoleBadge } from "@/components/role-badge";

export function GiftCoinsManager() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [amount, setAmount] = useState<number>(500);
  const [message, setMessage] = useState("You received 500 StreamCoins as a sign up bonus");
  const [tag, setTag] = useState("Admin Gift");

  // Fetch all users
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/admin/users/all"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users/all", {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const lowerQuery = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(lowerQuery) ||
        u.email.toLowerCase().includes(lowerQuery)
    );
  }, [users, searchQuery]);

  // Handle Select All / Deselect All for currently filtered users
  const handleSelectAll = () => {
    if (filteredUsers.length === 0) return;

    // Check if all currently filtered users are already selected
    const allFilteredSelected = filteredUsers.every(u => selectedUserIds.has(u.id));

    const newSelection = new Set(selectedUserIds);
    if (allFilteredSelected) {
      // Deselect all filtered
      filteredUsers.forEach(u => newSelection.delete(u.id));
    } else {
      // Select all filtered
      filteredUsers.forEach(u => newSelection.add(u.id));
    }
    setSelectedUserIds(newSelection);
  };

  const handleToggleUser = (userId: string) => {
    const newSelection = new Set(selectedUserIds);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUserIds(newSelection);
  };

  const giftMutation = useMutation({
    mutationFn: async () => {
      if (selectedUserIds.size === 0) throw new Error("Please select at least one user");
      if (amount <= 0) throw new Error("Amount must be greater than 0");
      if (!message.trim()) throw new Error("Message cannot be empty");

      const res = await fetch("/api/admin/users/gift", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          userIds: Array.from(selectedUserIds),
          amount,
          message,
          tag,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to send gifts");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success!",
        description: `Successfully gifted ${amount} coins to ${data.count} user(s).`,
      });
      // Reset form
      setSelectedUserIds(new Set());
      setAmount(500);
      setMessage("You received 500 StreamCoins as a sign up bonus");
      setTag("Admin Gift");
      setSearchQuery("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send gifts",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isAllFilteredSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedUserIds.has(u.id));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left side: User Selection */}
      <Card className="border-white/10 bg-black/20 flex flex-col h-[600px]">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Select Users
          </CardTitle>
          <CardDescription>
            Choose the users who will receive the coin gift.
          </CardDescription>
          
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by username or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-black/40 border-white/10"
            />
          </div>

          <div className="flex items-center justify-between mt-4 text-sm">
            <span className="text-muted-foreground">
              {selectedUserIds.size} selected
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-xs border-white/10 hover:bg-white/5"
              onClick={handleSelectAll}
              disabled={filteredUsers.length === 0}
            >
              {isAllFilteredSelected ? (
                <><Square className="w-3 h-3 mr-2" /> Deselect All</>
              ) : (
                <><CheckSquare className="w-3 h-3 mr-2" /> Select All Filtered</>
              )}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto px-6 py-0 mb-4 space-y-1 custom-scrollbar">
          {isLoadingUsers ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <p>Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Users className="w-8 h-8 mb-2 opacity-20" />
              <p>No users found</p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div 
                key={user.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                onClick={() => handleToggleUser(user.id)}
              >
                <Checkbox 
                  checked={selectedUserIds.has(user.id)} 
                  onCheckedChange={() => handleToggleUser(user.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.username} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col overflow-hidden">
                  <span className="font-medium truncate flex items-center gap-1">
                    {user.username}
                    <RoleBadge role={(user.username.toLowerCase() === 'admin' || (user as any).isAdmin) ? 'admin' : (user as any).isModerator ? 'moderator' : null} />
                  </span>
                  <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Right side: Gift Form */}
      <Card className="border-white/10 bg-black/20 flex flex-col h-[600px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Gift Details
          </CardTitle>
          <CardDescription>
            Specify the amount of coins and the notification message.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex-1 space-y-6">
          <div className="space-y-2">
            <Label>Amount (StreamCoins)</Label>
            <div className="relative">
              <Input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setAmount(isNaN(val) ? 0 : val);
                }}
                className="bg-black/40 border-white/10 pl-10 text-lg"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-yellow-500 font-bold">
                $
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              This amount will be added to the selected users' wallets.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Transaction Label (Tag)</Label>
            <Input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="e.g., Admin Gift, Event Winner, Sign Up Bonus"
              className="bg-black/40 border-white/10"
            />
            <p className="text-xs text-muted-foreground">
              This label will appear in the user's wallet transaction history.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Notification Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g., You received 500 StreamCoins as a sign up bonus"
              className="bg-black/40 border-white/10 min-h-[120px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Users will receive this message as an in-app notification. Clicking it will take them directly to their wallet.
            </p>
          </div>
        </CardContent>

        <CardFooter className="pt-4 border-t border-white/10">
          <Button 
            className="w-full font-semibold"
            size="lg"
            onClick={() => giftMutation.mutate()}
            disabled={selectedUserIds.size === 0 || amount <= 0 || !message.trim() || giftMutation.isPending}
          >
            {giftMutation.isPending ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sending Gifts...</>
            ) : (
              <><Gift className="w-5 h-5 mr-2" /> Send {amount} Coins to {selectedUserIds.size} User(s)</>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
