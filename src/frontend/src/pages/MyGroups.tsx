import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useGetAllVentureGroups, useJoinVentureGroup } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Plus, Users, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CreateGroupDialog from '../components/CreateGroupDialog';
import { Skeleton } from '@/components/ui/skeleton';

interface MyGroupsProps {
  onNavigateToGroup: (groupId: string) => void;
  onNavigateToGroupDashboard?: (groupId: string) => void;
}

export default function MyGroups({ onNavigateToGroup, onNavigateToGroupDashboard }: MyGroupsProps) {
  const { identity } = useInternetIdentity();
  const { data: groups, isLoading } = useGetAllVentureGroups();
  const joinGroup = useJoinVentureGroup();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const userPrincipal = identity?.getPrincipal().toString();

  const myGroups = groups?.filter(
    (group) =>
      group.admin.toString() === userPrincipal ||
      group.members.some((m) => m.principal.toString() === userPrincipal)
  ) || [];

  const adminGroups = myGroups.filter((g) => g.admin.toString() === userPrincipal);
  const memberGroups = myGroups.filter((g) => g.admin.toString() !== userPrincipal);
  const availableGroups = groups?.filter(
    (group) =>
      group.admin.toString() !== userPrincipal &&
      !group.members.some((m) => m.principal.toString() === userPrincipal)
  ) || [];

  const filterGroups = (groupList: typeof groups) => {
    if (!searchQuery.trim()) return groupList;
    return groupList?.filter(
      (group) =>
        group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const handleJoinGroup = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    joinGroup.mutate(groupId, {
      onSuccess: () => {
        // Navigate to group dashboard after successfully joining
        if (onNavigateToGroupDashboard) {
          onNavigateToGroupDashboard(groupId);
        }
      },
    });
  };

  const GroupCard = ({ group, showJoinButton = false }: { group: any; showJoinButton?: boolean }) => (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onNavigateToGroup(group.id)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{group.name}</CardTitle>
          <div className="flex items-center gap-2">
            {group.admin.toString() === userPrincipal && (
              <Badge variant="default">Admin</Badge>
            )}
            {showJoinButton && (
              <Button
                size="sm"
                onClick={(e) => handleJoinGroup(group.id, e)}
                disabled={joinGroup.isPending}
                className="gap-2"
              >
                <Users className="h-3 w-3" />
                {joinGroup.isPending ? 'Joining...' : 'Join'}
              </Button>
            )}
          </div>
        </div>
        <CardDescription className="line-clamp-2">{group.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline">{group.category}</Badge>
            <Badge variant="secondary">{group.contributionCycle}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Members:</span>
              <span className="ml-2 font-medium">{group.members.length + 1}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Contribution:</span>
              <span className="ml-2 font-medium">EUR {Number(group.monthlyContributionAmount)}</span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Started: {new Date(Number(group.startDate / BigInt(1_000_000))).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Groups</h1>
          <p className="text-muted-foreground">Manage and explore venture groups</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create New Group
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All My Groups ({myGroups.length})</TabsTrigger>
          <TabsTrigger value="admin">Admin ({adminGroups.length})</TabsTrigger>
          <TabsTrigger value="member">Member ({memberGroups.length})</TabsTrigger>
          <TabsTrigger value="available">Available ({availableGroups.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {filterGroups(myGroups)?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No groups found</h3>
                <p className="text-muted-foreground">Create a new group or join an existing one</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterGroups(myGroups)?.map((group) => (
                <GroupCard key={group.id} group={group} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="admin" className="space-y-6">
          {filterGroups(adminGroups)?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No admin groups</h3>
                <p className="text-muted-foreground">Create a new group to get started</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterGroups(adminGroups)?.map((group) => (
                <GroupCard key={group.id} group={group} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="member" className="space-y-6">
          {filterGroups(memberGroups)?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No member groups</h3>
                <p className="text-muted-foreground">Join a group to start contributing</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterGroups(memberGroups)?.map((group) => (
                <GroupCard key={group.id} group={group} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="available" className="space-y-6">
          {filterGroups(availableGroups)?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No available groups</h3>
                <p className="text-muted-foreground">All groups have been joined or you're already a member</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterGroups(availableGroups)?.map((group) => (
                <GroupCard key={group.id} group={group} showJoinButton />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateGroupDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
    </div>
  );
}
