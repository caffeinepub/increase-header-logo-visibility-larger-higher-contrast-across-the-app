import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useGetAllVentureGroups, useGetMilestonesByGroup } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Target, CheckCircle, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Milestones() {
  const { identity } = useInternetIdentity();
  const { data: groups, isLoading: groupsLoading } = useGetAllVentureGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const { data: milestones, isLoading: milestonesLoading } = useGetMilestonesByGroup(selectedGroupId);

  const userPrincipal = identity?.getPrincipal().toString();

  const myGroups = groups?.filter(
    (group) =>
      group.admin.toString() === userPrincipal ||
      group.members.some((m) => m.principal.toString() === userPrincipal)
  ) || [];

  const selectedGroup = groups?.find((g) => g.id === selectedGroupId);

  const completedMilestones = milestones?.filter((m) => m.status === 'completed') || [];
  const pendingMilestones = milestones?.filter((m) => m.status === 'pending') || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-500 gap-1">
            <CheckCircle className="h-3 w-3" />
            Completed
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (groupsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Milestones</h1>
        <p className="text-muted-foreground">Track project progress and achievements</p>
      </div>

      {/* Group Selector */}
      <div className="mb-6">
        <Select value={selectedGroupId || ''} onValueChange={setSelectedGroupId}>
          <SelectTrigger className="max-w-md">
            <SelectValue placeholder="Select a group to view milestones" />
          </SelectTrigger>
          <SelectContent>
            {myGroups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedGroupId && (
        <>
          {/* Stats */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{completedMilestones.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Milestones achieved</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
                <Clock className="h-5 w-5 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{pendingMilestones.length}</div>
                <p className="text-xs text-muted-foreground mt-1">In progress</p>
              </CardContent>
            </Card>
          </div>

          {/* Milestones List */}
          <Card>
            <CardHeader>
              <CardTitle>All Milestones</CardTitle>
              <CardDescription>
                Project milestones for {selectedGroup?.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {milestonesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-32" />
                  ))}
                </div>
              ) : !milestones || milestones.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No milestones yet</h3>
                  <p className="text-muted-foreground">Milestones will appear here once created by the admin</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {milestones.map((milestone) => (
                    <div
                      key={milestone.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">{milestone.name}</h3>
                          <p className="text-sm text-muted-foreground">{milestone.description}</p>
                        </div>
                        {getStatusBadge(milestone.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          Target: {new Date(Number(milestone.targetDate / BigInt(1_000_000))).toLocaleDateString()}
                        </span>
                      </div>
                      {milestone.image && (
                        <div className="mt-4">
                          <img
                            src={milestone.image.getDirectURL()}
                            alt={milestone.name}
                            className="rounded-lg max-h-48 object-cover"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!selectedGroupId && myGroups.length > 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Select a group</h3>
            <p className="text-muted-foreground">Choose a group from the dropdown to view milestones</p>
          </CardContent>
        </Card>
      )}

      {myGroups.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No groups joined</h3>
            <p className="text-muted-foreground">Join a group to view milestones</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
