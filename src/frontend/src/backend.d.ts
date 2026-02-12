import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export type Time = bigint;
export interface PayoutSuggestion {
    memberPrincipal: Principal;
    isPaid: boolean;
    memberName: string;
    ownershipPercentage: bigint;
    payoutAmount: bigint;
}
export interface Payout {
    id: string;
    member: Principal;
    groupId: string;
    markedBy: Principal;
    amount: bigint;
    datePaid: Time;
}
export interface DefaultMilestone {
    name: string;
    daysOffset: bigint;
    description: string;
}
export interface InviteCode {
    created: Time;
    code: string;
    used: boolean;
}
export interface GroupDashboardData {
    activityFeed: Array<Activity>;
    recentContributions: Array<ContributionWithProfile>;
    groupId: string;
    groupProgress: GroupProgress;
    groupInfo: VentureGroup;
    financialSummary: FinancialSummary;
    milestones: Array<Milestone>;
}
export interface Contribution {
    id: string;
    member: Principal;
    status: ContributionStatus;
    groupId: string;
    amount: bigint;
    datePaid?: Time;
}
export interface OwnershipPercentage {
    totalContributed: bigint;
    memberPrincipal: Principal;
    ownershipPercentage: bigint;
}
export interface FinancialSummary {
    totalRaised: bigint;
    totalSpent: bigint;
    remainingBalance: bigint;
    currency: string;
    totalRevenue: bigint;
    netProfit: bigint;
}
export interface GroupMember {
    principal: Principal;
    role: UserRole;
    joinedDate: Time;
}
export interface Revenue {
    id: string;
    source: string;
    date: Time;
    description: string;
    groupId: string;
    addedBy: Principal;
    amount: bigint;
}
export interface Expense {
    id: string;
    receiptImage?: ExternalBlob;
    description: string;
    dateSpent: Time;
    groupId: string;
    addedBy: Principal;
    category: string;
    amount: bigint;
}
export interface Milestone {
    id: string;
    status: MilestoneStatus;
    name: string;
    description: string;
    groupId: string;
    targetDate: Time;
    image?: ExternalBlob;
}
export interface RSVP {
    name: string;
    inviteCode: string;
    timestamp: Time;
    attending: boolean;
}
export interface GroupProgress {
    progressPercentage: bigint;
    totalContributions: bigint;
    groupId: string;
    totalSpent: bigint;
    targetAmount: bigint;
    remainingBalance: bigint;
    currency: string;
    totalRevenue: bigint;
    perMemberContribution: bigint;
    netProfit: bigint;
}
export interface Activity {
    id: string;
    activityType: ActivityType;
    groupId: string;
    timestamp: Time;
    details: string;
}
export interface PlannedPayment {
    id: string;
    member: Principal;
    status: PlannedPaymentStatus;
    dueDate: Time;
    description: string;
    groupId: string;
    amount: bigint;
}
export interface CropTemplate {
    name: string;
    category: string;
    defaultMilestones: Array<DefaultMilestone>;
}
export interface ContributionWithProfile {
    id: string;
    contributorName: string;
    member: Principal;
    status: ContributionStatus;
    groupId: string;
    amount: bigint;
    datePaid?: Time;
}
export interface VentureGroup {
    id: string;
    members: Array<GroupMember>;
    admin: Principal;
    endDate: Time;
    name: string;
    description: string;
    contributionCycle: ContributionCycle;
    targetAmount: bigint;
    currency: string;
    category: string;
    monthlyContributionAmount: bigint;
    startDate: Time;
}
export interface UserProfile {
    created: Time;
    country: string;
    name: string;
    role: UserRole;
    phone?: string;
}
export enum ActivityType {
    expenseAdded = "expenseAdded",
    memberJoined = "memberJoined",
    milestoneUpdated = "milestoneUpdated",
    contributionMade = "contributionMade"
}
export enum ContributionCycle {
    quarterly = "quarterly",
    monthly = "monthly",
    weekly = "weekly"
}
export enum ContributionStatus {
    pending = "pending",
    paid = "paid",
    overdue = "overdue"
}
export enum MilestoneStatus {
    pending = "pending",
    completed = "completed"
}
export enum PlannedPaymentStatus {
    upcoming = "upcoming",
    paid = "paid",
    missed = "missed"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addActivity(activity: Activity): Promise<void>;
    addContribution(contribution: Contribution): Promise<void>;
    addExpense(expense: Expense): Promise<void>;
    addMilestone(milestone: Milestone): Promise<void>;
    addRevenue(groupId: string, revenue: Revenue): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    calculateOwnershipPercentages(groupId: string): Promise<Array<OwnershipPercentage>>;
    calculatePayouts(groupId: string): Promise<Array<PayoutSuggestion>>;
    createPlannedPayment(payment: PlannedPayment): Promise<void>;
    createVentureGroupWithMilestones(group: VentureGroup, cropType: string): Promise<void>;
    deleteContribution(contributionId: string): Promise<void>;
    deleteExpense(expenseId: string): Promise<void>;
    generateInviteCode(): Promise<string>;
    getActivityFeedByGroup(groupId: string): Promise<Array<Activity>>;
    getAllRSVPs(): Promise<Array<RSVP>>;
    getAllVentureGroups(): Promise<Array<VentureGroup>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getContributionsByGroup(groupId: string): Promise<Array<Contribution>>;
    getContributionsWithProfilesByGroup(groupId: string): Promise<Array<ContributionWithProfile>>;
    getCropTemplates(): Promise<Array<CropTemplate>>;
    getExpensesByGroup(groupId: string): Promise<Array<Expense>>;
    getFinancialSummaryByGroup(groupId: string): Promise<FinancialSummary>;
    getGroupDashboardData(groupId: string): Promise<GroupDashboardData>;
    getGroupProgress(groupId: string): Promise<GroupProgress | null>;
    getInviteCodes(): Promise<Array<InviteCode>>;
    getMilestonesByGroup(groupId: string): Promise<Array<Milestone>>;
    getMyPlannedPayments(): Promise<Array<PlannedPayment>>;
    getMyReturns(groupId: string): Promise<{
        totalReceived: bigint;
        totalContributed: bigint;
        netProfit: bigint;
    }>;
    getMyVentureGroups(): Promise<Array<string>>;
    getPayoutsByGroup(groupId: string): Promise<Array<Payout>>;
    getPlannedPaymentsByGroup(groupId: string): Promise<Array<PlannedPayment>>;
    getRevenuesByGroup(groupId: string): Promise<Array<Revenue>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getVentureGroup(id: string): Promise<VentureGroup | null>;
    initializeAccessControl(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    joinVentureGroup(groupId: string): Promise<{
        userGroups: Array<string>;
        wasNewMember: boolean;
        group?: VentureGroup;
    }>;
    recordPayout(groupId: string, member: Principal, amount: bigint): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    submitRSVP(name: string, attending: boolean, inviteCode: string): Promise<void>;
    updateContribution(contributionId: string, updatedContribution: Contribution): Promise<void>;
    updateMilestoneStatus(milestoneId: string, status: MilestoneStatus): Promise<void>;
    updatePlannedPayment(paymentId: string, updatedPayment: PlannedPayment): Promise<void>;
    updateVentureGroup(groupId: string, updatedGroup: VentureGroup): Promise<void>;
    uploadMilestoneImage(milestoneId: string, blob: ExternalBlob): Promise<void>;
    uploadReceiptImage(expenseId: string, blob: ExternalBlob): Promise<void>;
}
