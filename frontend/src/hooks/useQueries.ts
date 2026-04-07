import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { UserProfile, VentureGroup, Contribution, ContributionWithProfile, Milestone, Activity, GroupProgress, Expense, Revenue, OwnershipPercentage, PayoutSuggestion, Payout, CropTemplate, GroupDashboardData, PlannedPayment, RawAmountSample } from '../backend';
import { UserRole, ContributionStatus, MilestoneStatus, PlannedPaymentStatus } from '../backend';
import { toast } from 'sonner';
import type { Principal } from '@icp-sdk/core/principal';
import { normalizeBackendAmountToCents } from '../lib/moneyModel';

// Helper to normalize monetary fields in a record
function normalizeMonetaryFields<T extends Record<string, any>>(
  record: T,
  fields: (keyof T)[],
  groupId?: string
): T {
  const normalized = { ...record };
  for (const field of fields) {
    if (normalized[field] !== undefined && normalized[field] !== null) {
      const rawValue = normalized[field];
      if (typeof rawValue === 'bigint' || typeof rawValue === 'number') {
        // Store normalized cents as number for consistent frontend usage
        (normalized as any)[field] = normalizeBackendAmountToCents(rawValue, groupId);
      }
    }
  }
  return normalized;
}

// User Profile Queries
export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useGetUserProfile(principal: Principal | null) {
  const { actor, isFetching } = useActor();

  return useQuery<UserProfile | null>({
    queryKey: ['userProfile', principal?.toString()],
    queryFn: async () => {
      if (!actor || !principal) return null;
      return actor.getUserProfile(principal);
    },
    enabled: !!actor && !isFetching && !!principal,
    retry: false,
  });
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      toast.success('Profile saved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save profile: ${error.message}`);
    },
  });
}

export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isAdmin'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

// Crop Template Queries
export function useGetCropTemplates() {
  const { actor, isFetching } = useActor();

  return useQuery<CropTemplate[]>({
    queryKey: ['cropTemplates'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCropTemplates();
    },
    enabled: !!actor && !isFetching,
  });
}

// Venture Group Queries
export function useGetAllVentureGroups() {
  const { actor, isFetching } = useActor();

  return useQuery<VentureGroup[]>({
    queryKey: ['ventureGroups'],
    queryFn: async () => {
      if (!actor) return [];
      const groups = await actor.getAllVentureGroups();
      // Normalize monetary fields for each group
      return groups.map(group => 
        normalizeMonetaryFields(group, ['monthlyContributionAmount', 'targetAmount'], group.id)
      );
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetVentureGroup(groupId: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery<VentureGroup | null>({
    queryKey: ['ventureGroup', groupId],
    queryFn: async () => {
      if (!actor || !groupId) return null;
      const group = await actor.getVentureGroup(groupId);
      if (!group) return null;
      return normalizeMonetaryFields(group, ['monthlyContributionAmount', 'targetAmount'], groupId);
    },
    enabled: !!actor && !isFetching && !!groupId,
  });
}

export function useGetMyVentureGroups() {
  const { actor, isFetching } = useActor();

  return useQuery<string[]>({
    queryKey: ['myVentureGroups'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyVentureGroups();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateVentureGroup() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ group, cropType }: { group: VentureGroup; cropType: string }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.createVentureGroupWithMilestones(group, cropType);
      return group.id;
    },
    onSuccess: (groupId) => {
      queryClient.invalidateQueries({ queryKey: ['ventureGroups'] });
      queryClient.invalidateQueries({ queryKey: ['myVentureGroups'] });
      toast.success('Venture group created successfully');
      return groupId;
    },
    onError: (error: Error) => {
      toast.error(`Failed to create group: ${error.message}`);
    },
  });
}

export function useUpdateVentureGroup() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, updatedGroup }: { groupId: string; updatedGroup: VentureGroup }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateVentureGroup(groupId, updatedGroup);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ventureGroups'] });
      queryClient.invalidateQueries({ queryKey: ['ventureGroup', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['groupProgress', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['groupDashboard', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['myVentureGroups'] });
      toast.success('Group updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update group: ${error.message}`);
    },
  });
}

export function useJoinVentureGroup() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      if (!actor) throw new Error('Actor not available');
      const result = await actor.joinVentureGroup(groupId);
      return { groupId, ...result };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ventureGroups'] });
      queryClient.invalidateQueries({ queryKey: ['ventureGroup', data.groupId] });
      queryClient.invalidateQueries({ queryKey: ['groupProgress', data.groupId] });
      queryClient.invalidateQueries({ queryKey: ['groupDashboard', data.groupId] });
      queryClient.invalidateQueries({ queryKey: ['myVentureGroups'] });
      
      if (data.wasNewMember) {
        toast.success('Successfully joined the group');
      } else {
        toast.info('You are already a member of this group');
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to join group: ${error.message}`);
    },
  });
}

// Group Progress Query
export function useGetGroupProgress(groupId: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery<GroupProgress | null>({
    queryKey: ['groupProgress', groupId],
    queryFn: async () => {
      if (!actor || !groupId) return null;
      const progress = await actor.getGroupProgress(groupId);
      if (!progress) return null;
      return normalizeMonetaryFields(
        progress,
        ['targetAmount', 'totalContributions', 'totalSpent', 'totalRevenue', 'netProfit', 'remainingBalance', 'perMemberContribution'],
        groupId
      );
    },
    enabled: !!actor && !isFetching && !!groupId,
  });
}

// Group Dashboard Query
export function useGetGroupDashboardData(groupId: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery<GroupDashboardData | null>({
    queryKey: ['groupDashboard', groupId],
    queryFn: async () => {
      if (!actor || !groupId) return null;
      const data = await actor.getGroupDashboardData(groupId);
      if (!data) return null;
      
      // Normalize all monetary fields
      return {
        ...data,
        groupInfo: normalizeMonetaryFields(data.groupInfo, ['monthlyContributionAmount', 'targetAmount'], groupId),
        groupProgress: normalizeMonetaryFields(
          data.groupProgress,
          ['targetAmount', 'totalContributions', 'totalSpent', 'totalRevenue', 'netProfit', 'remainingBalance', 'perMemberContribution'],
          groupId
        ),
        recentContributions: data.recentContributions.map(c => normalizeMonetaryFields(c, ['amount'], groupId)),
        financialSummary: normalizeMonetaryFields(
          data.financialSummary,
          ['totalRaised', 'totalSpent', 'totalRevenue', 'remainingBalance', 'netProfit'],
          groupId
        ),
      };
    },
    enabled: !!actor && !isFetching && !!groupId,
  });
}

// Contribution Queries
export function useGetContributionsByGroup(groupId: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery<Contribution[]>({
    queryKey: ['contributions', groupId],
    queryFn: async () => {
      if (!actor || !groupId) return [];
      const contributions = await actor.getContributionsByGroup(groupId);
      return contributions.map(c => normalizeMonetaryFields(c, ['amount'], groupId));
    },
    enabled: !!actor && !isFetching && !!groupId,
  });
}

export function useGetContributionsWithProfilesByGroup(groupId: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery<ContributionWithProfile[]>({
    queryKey: ['contributionsWithProfiles', groupId],
    queryFn: async () => {
      if (!actor || !groupId) return [];
      const contributions = await actor.getContributionsWithProfilesByGroup(groupId);
      return contributions.map(c => normalizeMonetaryFields(c, ['amount'], groupId));
    },
    enabled: !!actor && !isFetching && !!groupId,
  });
}

export function useAddContribution() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contribution: Contribution) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addContribution(contribution);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contributions', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['contributionsWithProfiles', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['groupProgress', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['groupDashboard', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['ownershipPercentages', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['payoutSuggestions', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['myReturns', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['plannedPayments'] });
      queryClient.invalidateQueries({ queryKey: ['myPlannedPayments'] });
      toast.success('Contribution recorded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add contribution: ${error.message}`);
    },
  });
}

export function useUpdateContribution() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contributionId, updatedContribution }: { contributionId: string; updatedContribution: Contribution }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateContribution(contributionId, updatedContribution);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contributions', variables.updatedContribution.groupId] });
      queryClient.invalidateQueries({ queryKey: ['contributionsWithProfiles', variables.updatedContribution.groupId] });
      queryClient.invalidateQueries({ queryKey: ['groupProgress', variables.updatedContribution.groupId] });
      queryClient.invalidateQueries({ queryKey: ['groupDashboard', variables.updatedContribution.groupId] });
      queryClient.invalidateQueries({ queryKey: ['ownershipPercentages', variables.updatedContribution.groupId] });
      queryClient.invalidateQueries({ queryKey: ['payoutSuggestions', variables.updatedContribution.groupId] });
      queryClient.invalidateQueries({ queryKey: ['myReturns', variables.updatedContribution.groupId] });
      toast.success('Contribution updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update contribution: ${error.message}`);
    },
  });
}

export function useDeleteContribution() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contributionId, groupId }: { contributionId: string; groupId: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteContribution(contributionId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contributions', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['contributionsWithProfiles', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['groupProgress', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['groupDashboard', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['ownershipPercentages', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['payoutSuggestions', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['myReturns', variables.groupId] });
      toast.success('Contribution deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete contribution: ${error.message}`);
    },
  });
}

// Expense Queries
export function useGetExpensesByGroup(groupId: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery<Expense[]>({
    queryKey: ['expenses', groupId],
    queryFn: async () => {
      if (!actor || !groupId) return [];
      const expenses = await actor.getExpensesByGroup(groupId);
      return expenses.map(e => normalizeMonetaryFields(e, ['amount'], groupId));
    },
    enabled: !!actor && !isFetching && !!groupId,
  });
}

export function useAddExpense() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, expense }: { groupId: string; expense: Expense }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addExpense(expense);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['groupProgress', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['groupDashboard', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['payoutSuggestions', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['financialSummary', variables.groupId] });
      toast.success('Expense recorded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add expense: ${error.message}`);
    },
  });
}

export function useDeleteExpense() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ expenseId, groupId }: { expenseId: string; groupId: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteExpense(expenseId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['groupProgress', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['groupDashboard', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['payoutSuggestions', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['financialSummary', variables.groupId] });
      toast.success('Expense deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete expense: ${error.message}`);
    },
  });
}

// Revenue Queries
export function useGetRevenuesByGroup(groupId: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery<Revenue[]>({
    queryKey: ['revenues', groupId],
    queryFn: async () => {
      if (!actor || !groupId) return [];
      const revenues = await actor.getRevenuesByGroup(groupId);
      return revenues.map(r => normalizeMonetaryFields(r, ['amount'], groupId));
    },
    enabled: !!actor && !isFetching && !!groupId,
  });
}

export function useAddRevenue() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, revenue }: { groupId: string; revenue: Revenue }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addRevenue(groupId, revenue);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['revenues', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['groupProgress', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['groupDashboard', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['payoutSuggestions', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['financialSummary', variables.groupId] });
      toast.success('Revenue recorded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add revenue: ${error.message}`);
    },
  });
}

// Financial Summary Query
export function useGetFinancialSummaryByGroup(groupId: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['financialSummary', groupId],
    queryFn: async () => {
      if (!actor || !groupId) return null;
      const summary = await actor.getFinancialSummaryByGroup(groupId);
      return normalizeMonetaryFields(
        summary,
        ['totalRaised', 'totalSpent', 'totalRevenue', 'remainingBalance', 'netProfit'],
        groupId
      );
    },
    enabled: !!actor && !isFetching && !!groupId,
  });
}

// Milestone Queries
export function useGetMilestonesByGroup(groupId: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery<Milestone[]>({
    queryKey: ['milestones', groupId],
    queryFn: async () => {
      if (!actor || !groupId) return [];
      return actor.getMilestonesByGroup(groupId);
    },
    enabled: !!actor && !isFetching && !!groupId,
  });
}

export function useAddMilestone() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (milestone: Milestone) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addMilestone(milestone);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['milestones', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['groupDashboard', variables.groupId] });
      toast.success('Milestone created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add milestone: ${error.message}`);
    },
  });
}

export function useUpdateMilestoneStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ milestoneId, status, groupId }: { milestoneId: string; status: MilestoneStatus; groupId: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateMilestoneStatus(milestoneId, status);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['milestones', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['groupDashboard', variables.groupId] });
      toast.success('Milestone status updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update milestone: ${error.message}`);
    },
  });
}

// Activity Feed Query
export function useGetActivityFeedByGroup(groupId: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery<Activity[]>({
    queryKey: ['activityFeed', groupId],
    queryFn: async () => {
      if (!actor || !groupId) return [];
      return actor.getActivityFeedByGroup(groupId);
    },
    enabled: !!actor && !isFetching && !!groupId,
  });
}

// Ownership & Payout Queries
export function useCalculateOwnershipPercentages(groupId: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery<OwnershipPercentage[]>({
    queryKey: ['ownershipPercentages', groupId],
    queryFn: async () => {
      if (!actor || !groupId) return [];
      const percentages = await actor.calculateOwnershipPercentages(groupId);
      return percentages.map(p => normalizeMonetaryFields(p, ['totalContributed'], groupId));
    },
    enabled: !!actor && !isFetching && !!groupId,
  });
}

export function useCalculatePayouts(groupId: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery<PayoutSuggestion[]>({
    queryKey: ['payoutSuggestions', groupId],
    queryFn: async () => {
      if (!actor || !groupId) return [];
      const suggestions = await actor.calculatePayouts(groupId);
      return suggestions.map(s => normalizeMonetaryFields(s, ['payoutAmount'], groupId));
    },
    enabled: !!actor && !isFetching && !!groupId,
  });
}

export function useRecordPayout() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, member, amount }: { groupId: string; member: Principal; amount: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.recordPayout(groupId, member, amount);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payouts', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['payoutSuggestions', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['myReturns', variables.groupId] });
      toast.success('Payout recorded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to record payout: ${error.message}`);
    },
  });
}

export function useGetPayoutsByGroup(groupId: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery<Payout[]>({
    queryKey: ['payouts', groupId],
    queryFn: async () => {
      if (!actor || !groupId) return [];
      const payouts = await actor.getPayoutsByGroup(groupId);
      return payouts.map(p => normalizeMonetaryFields(p, ['amount'], groupId));
    },
    enabled: !!actor && !isFetching && !!groupId,
  });
}

export function useGetMyReturns(groupId: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['myReturns', groupId],
    queryFn: async () => {
      if (!actor || !groupId) return null;
      const returns = await actor.getMyReturns(groupId);
      return normalizeMonetaryFields(
        returns,
        ['totalContributed', 'totalReceived', 'netProfit'],
        groupId
      );
    },
    enabled: !!actor && !isFetching && !!groupId,
  });
}

// Planned Payments Queries
export function useGetPlannedPaymentsByGroup(groupId: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery<PlannedPayment[]>({
    queryKey: ['plannedPayments', groupId],
    queryFn: async () => {
      if (!actor || !groupId) return [];
      const payments = await actor.getPlannedPaymentsByGroup(groupId);
      return payments.map(p => normalizeMonetaryFields(p, ['amount'], groupId));
    },
    enabled: !!actor && !isFetching && !!groupId,
  });
}

export function useGetMyPlannedPayments() {
  const { actor, isFetching } = useActor();

  return useQuery<PlannedPayment[]>({
    queryKey: ['myPlannedPayments'],
    queryFn: async () => {
      if (!actor) return [];
      const payments = await actor.getMyPlannedPayments();
      // Note: We normalize without groupId here since these span multiple groups
      return payments.map(p => normalizeMonetaryFields(p, ['amount']));
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreatePlannedPayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment: PlannedPayment) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createPlannedPayment(payment);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plannedPayments', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['myPlannedPayments'] });
      queryClient.invalidateQueries({ queryKey: ['groupDashboard', variables.groupId] });
      toast.success('Planned payment created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create planned payment: ${error.message}`);
    },
  });
}

export function useUpdatePlannedPayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ paymentId, updatedPayment }: { paymentId: string; updatedPayment: PlannedPayment }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updatePlannedPayment(paymentId, updatedPayment);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plannedPayments', variables.updatedPayment.groupId] });
      queryClient.invalidateQueries({ queryKey: ['myPlannedPayments'] });
      queryClient.invalidateQueries({ queryKey: ['groupDashboard', variables.updatedPayment.groupId] });
      toast.success('Planned payment updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update planned payment: ${error.message}`);
    },
  });
}

// Admin-only: Raw Amount Samples Query
export function useGetRawAmountsByGroup(groupId: string | null, sampleSize: number = 5) {
  const { actor, isFetching } = useActor();

  return useQuery<RawAmountSample[]>({
    queryKey: ['rawAmounts', groupId, sampleSize],
    queryFn: async () => {
      if (!actor || !groupId) return [];
      return actor.getRawAmountsByGroup(groupId, BigInt(sampleSize));
    },
    enabled: !!actor && !isFetching && !!groupId,
    retry: false,
  });
}
