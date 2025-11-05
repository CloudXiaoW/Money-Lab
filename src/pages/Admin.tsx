import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Users, TrendingUp, Award, Flame, Star, Target, Zap, Crown, Trophy } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  points: number;
  currentStreak: number;
  longestStreak: number;
  badges: string[];
  lastPrediction: string;
  createdAt: string;
}

interface Analytics {
  totalUsers: number;
  totalPredictions: number;
  totalPoints: number;
  activeUsers: number;
  badgeDistribution: Record<string, number>;
  assetDistribution: Record<string, number>;
}

const Admin = () => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [manageModal, setManageModal] = useState<{ open: boolean; user: AdminUser | null; action: string }>({
    open: false,
    user: null,
    action: "",
  });
  const [actionValue, setActionValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const badgeOptions = [
    { id: 'first_prediction', name: 'First Prediction', icon: Star },
    { id: 'accuracy_10', name: '10 Accurate', icon: Target },
    { id: 'streak_7', name: '7-Day Streak', icon: Flame },
    { id: 'streak_30', name: '30-Day Streak', icon: Zap },
    { id: 'top_3', name: 'Top 3', icon: Trophy },
    { id: 'legendary', name: 'Legendary', icon: Crown },
  ];

  useEffect(() => {
    const checkAdminAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Check if user has admin role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "You don't have admin privileges",
        });
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);
      await Promise.all([fetchUsers(), fetchAnalytics()]);
      setLoading(false);
    };

    checkAdminAccess();
  }, [navigate, toast]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-get-users');
      if (error) throw error;
      setUsers(data.users);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch users",
      });
    }
  };

  const fetchAnalytics = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-analytics');
      if (error) throw error;
      setAnalytics(data);
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch analytics",
      });
    }
  };

  const openManageModal = (user: AdminUser, action: string) => {
    setManageModal({ open: true, user, action });
    setActionValue("");
  };

  const handleManageAction = async () => {
    if (!manageModal.user) return;

    setSubmitting(true);
    try {
      const body: any = {
        action: manageModal.action,
        userId: manageModal.user.id,
      };

      if (manageModal.action === 'award_badge') {
        body.badge = actionValue;
      } else if (manageModal.action === 'adjust_points') {
        body.points = parseInt(actionValue, 10);
      }

      const { data, error } = await supabase.functions.invoke('admin-manage-user', {
        body,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: data.message,
      });

      setManageModal({ open: false, user: null, action: "" });
      await fetchUsers();
    } catch (error: any) {
      console.error('Error managing user:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to perform action",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEvaluatePredictions = async () => {
    setEvaluating(true);
    try {
      const { data, error } = await supabase.functions.invoke('evaluate-predictions');
      if (error) throw error;
      
      toast({
        title: 'Predictions Evaluated!',
        description: `Processed ${data.evaluated || 0} predictions for ${data.users || 0} users`,
      });
      
      // Refresh analytics after evaluation
      await fetchAnalytics();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to evaluate predictions',
      });
    } finally {
      setEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Admin Actions */}
        <Card className="shadow-lg mb-8">
          <CardHeader>
            <CardTitle>Admin Actions</CardTitle>
            <CardDescription>Manage system operations</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleEvaluatePredictions} 
              disabled={evaluating}
              className="w-full sm:w-auto"
            >
              {evaluating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Evaluating...
                </>
              ) : (
                "Evaluate Yesterday's Predictions"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-3xl font-bold text-primary">{analytics?.totalUsers || 0}</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Users (7d)</p>
                  <p className="text-3xl font-bold text-accent">{analytics?.activeUsers || 0}</p>
                </div>
                <Flame className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Predictions</p>
                  <p className="text-3xl font-bold">{analytics?.totalPredictions || 0}</p>
                </div>
                <TrendingUp className="h-8 w-8" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Points</p>
                  <p className="text-3xl font-bold">{analytics?.totalPoints || 0}</p>
                </div>
                <Award className="h-8 w-8" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Badge Distribution */}
        {analytics?.badgeDistribution && Object.keys(analytics.badgeDistribution).length > 0 && (
          <Card className="shadow-xl mb-8">
            <CardHeader>
              <CardTitle>Badge Distribution</CardTitle>
              <CardDescription>How many users have earned each badge</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Object.entries(analytics.badgeDistribution).map(([badge, count]) => {
                  const badgeInfo = badgeOptions.find(b => b.id === badge);
                  const Icon = badgeInfo?.icon || Award;
                  return (
                    <div key={badge} className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
                      <Icon className="h-6 w-6 text-primary mb-2" />
                      <p className="text-xs font-semibold text-center mb-1">{badgeInfo?.name || badge}</p>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Management Table */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage users, badges, and streaks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>User</TableHead>
                    <TableHead className="text-center">Points</TableHead>
                    <TableHead className="text-center">Streak</TableHead>
                    <TableHead className="text-center">Badges</TableHead>
                    <TableHead className="text-center">Last Prediction</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-semibold">{user.displayName}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{user.points}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Flame className="h-4 w-4 text-accent" />
                          <span>{user.currentStreak}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{user.badges.length}</Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {user.lastPrediction ? new Date(user.lastPrediction).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openManageModal(user, 'reset_streak')}
                          >
                            Reset Streak
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openManageModal(user, 'award_badge')}
                          >
                            Award Badge
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openManageModal(user, 'adjust_points')}
                          >
                            Adjust Points
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manage User Modal */}
      <Dialog open={manageModal.open} onOpenChange={(open) => setManageModal({ ...manageModal, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {manageModal.action === 'reset_streak' && 'Reset User Streak'}
              {manageModal.action === 'award_badge' && 'Award Badge'}
              {manageModal.action === 'adjust_points' && 'Adjust Points'}
            </DialogTitle>
            <DialogDescription>
              Managing: {manageModal.user?.displayName} ({manageModal.user?.email})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {manageModal.action === 'reset_streak' && (
              <p className="text-sm text-muted-foreground">
                This will reset the user's current streak to 0. This action cannot be undone.
              </p>
            )}

            {manageModal.action === 'award_badge' && (
              <div className="space-y-2">
                <Label>Select Badge</Label>
                <Select value={actionValue} onValueChange={setActionValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a badge to award" />
                  </SelectTrigger>
                  <SelectContent>
                    {badgeOptions.map(badge => (
                      <SelectItem key={badge.id} value={badge.id}>
                        {badge.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {manageModal.action === 'adjust_points' && (
              <div className="space-y-2">
                <Label>Points Adjustment</Label>
                <Input
                  type="number"
                  placeholder="Enter positive or negative number"
                  value={actionValue}
                  onChange={(e) => setActionValue(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Current points: {manageModal.user?.points}. Enter a positive number to add points or negative to subtract.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setManageModal({ open: false, user: null, action: "" })}>
              Cancel
            </Button>
            <Button onClick={handleManageAction} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
