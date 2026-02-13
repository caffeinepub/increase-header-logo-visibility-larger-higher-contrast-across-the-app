import AccessControl "authorization/access-control";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import OrderedMap "mo:base/OrderedMap";
import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Text "mo:base/Text";
import Debug "mo:base/Debug";
import List "mo:base/List";
import Iter "mo:base/Iter";
import Int "mo:base/Int";
import Array "mo:base/Array";
import Random "mo:base/Random";
import InviteLinksModule "invite-links/invite-links-module";
import Timer "mo:base/Timer";

actor AgricultureVenturePlatform {
  let accessControlState = AccessControl.initState();
  let storage = Storage.new();
  include MixinStorage(storage);

  let inviteState = InviteLinksModule.initState();

  transient let principalMap = OrderedMap.Make<Principal>(Principal.compare);
  transient let textMap = OrderedMap.Make<Text>(Text.compare);

  var userProfiles = principalMap.empty<UserProfile>();
  var userGroups = principalMap.empty<[Text]>(); // New mapping for user-group relationships
  var ventureGroups = textMap.empty<VentureGroup>();
  var contributions = textMap.empty<Contribution>();
  var expenses = textMap.empty<Expense>();
  var revenues = textMap.empty<Revenue>();
  var milestones = textMap.empty<Milestone>();
  var activityFeed = List.nil<Activity>();
  var payouts = textMap.empty<Payout>();
  var plannedPayments = textMap.empty<PlannedPayment>();

  public type CropTemplate = {
    name : Text;
    category : Text;
    defaultMilestones : [DefaultMilestone];
  };

  public type DefaultMilestone = {
    name : Text;
    daysOffset : Int;
    description : Text;
  };

  let cropTemplates : [CropTemplate] = [
    {
      name = "Maize (Corn)";
      category = "Maize";
      defaultMilestones = [
        {
          name = "Planting";
          daysOffset = 2;
          description = "Plant maize seeds.";
        },
        {
          name = "Fertilizer Application";
          daysOffset = 30;
          description = "Apply fertilizer 30 days after planting.";
        },
        {
          name = "Harvest";
          daysOffset = 120;
          description = "Harvest maize 120 days after planting.";
        },
      ];
    },
    {
      name = "Beans";
      category = "Beans";
      defaultMilestones = [];
    },
    {
      name = "Poultry";
      category = "Poultry";
      defaultMilestones = [];
    },
    {
      name = "General";
      category = "General";
      defaultMilestones = [];
    },
  ];

  public query func getCropTemplates() : async [CropTemplate] {
    cropTemplates;
  };

  public shared ({ caller }) func createVentureGroupWithMilestones(group : VentureGroup, cropType : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can create groups");
    };
    if (group.admin != caller) {
      Debug.trap("Unauthorized: You can only create groups where you are the admin");
    };

    let template = Array.find<CropTemplate>(
      cropTemplates,
      func(t) { t.name == cropType },
    );

    switch (template) {
      case (?t) {
        if (group.category != t.category) {
          Debug.trap("Invalid: Group category must match the crop template category");
        };
      };
      case (null) {};
    };

    ventureGroups := textMap.put(ventureGroups, group.id, group);

    switch (template) {
      case (?template) {
        let dayInNanos : Int = 24 * 60 * 60 * 1_000_000_000;

        for (defaultMilestone in template.defaultMilestones.vals()) {
          let offsetNanos = dayInNanos * defaultMilestone.daysOffset;
          let safeOffset = Int.abs(offsetNanos);
          let milestone : Milestone = {
            id = Text.concat(group.id, Text.concat("_", defaultMilestone.name));
            groupId = group.id;
            name = defaultMilestone.name;
            targetDate = group.startDate + safeOffset;
            description = defaultMilestone.description;
            status = #pending;
            image = null;
          };
          milestones := textMap.put(milestones, milestone.id, milestone);
        };
      };
      case (null) {};
    };

    // Automatically add admin to user's group list
    userGroups := principalMap.put(userGroups, caller, [group.id]);
  };

  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  public type UserProfile = {
    name : Text;
    phone : ?Text;
    country : Text;
    role : AccessControl.UserRole;
    created : Time.Time;
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view profiles");
    };
    principalMap.get(userProfiles, caller);
  };

  private func shareGroup(caller : Principal, user : Principal) : Bool {
    let allGroups = Iter.toArray(textMap.vals(ventureGroups));
    let found = Array.find<VentureGroup>(
      allGroups,
      func(group : VentureGroup) : Bool {
        let callerIsMember = group.admin == caller or Array.find<GroupMember>(group.members, func(m : GroupMember) : Bool { m.principal == caller }) != null;
        let userIsMember = group.admin == user or Array.find<GroupMember>(group.members, func(m : GroupMember) : Bool { m.principal == user }) != null;
        callerIsMember and userIsMember;
      },
    );
    found != null;
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller == user) {
      return principalMap.get(userProfiles, user);
    };
    if (AccessControl.isAdmin(accessControlState, caller)) {
      return principalMap.get(userProfiles, user);
    };
    if (AccessControl.hasPermission(accessControlState, caller, #user) and shareGroup(caller, user)) {
      return principalMap.get(userProfiles, user);
    };
    Debug.trap("Unauthorized: Can only view profiles of users in your groups");
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles := principalMap.put(userProfiles, caller, profile);
  };

  public type VentureGroup = {
    id : Text;
    name : Text;
    description : Text;
    category : Text;
    monthlyContributionAmount : Int;
    contributionCycle : ContributionCycle;
    startDate : Time.Time;
    endDate : Time.Time;
    admin : Principal;
    members : [GroupMember];
    currency : Text;
    targetAmount : Int;
  };

  public type ContributionCycle = {
    #monthly;
    #weekly;
    #quarterly;
  };

  public type GroupMember = {
    principal : Principal;
    role : AccessControl.UserRole;
    joinedDate : Time.Time;
  };

  public type Contribution = {
    id : Text;
    groupId : Text;
    member : Principal;
    amount : Int;
    status : ContributionStatus;
    datePaid : ?Time.Time;
  };

  public type ContributionStatus = {
    #paid;
    #pending;
    #overdue;
  };

  public type Expense = {
    id : Text;
    groupId : Text;
    category : Text;
    amount : Int;
    description : Text;
    dateSpent : Time.Time;
    addedBy : Principal;
    receiptImage : ?Storage.ExternalBlob;
  };

  public type Revenue = {
    id : Text;
    groupId : Text;
    source : Text;
    amount : Int;
    date : Time.Time;
    description : Text;
    addedBy : Principal;
  };

  public type Milestone = {
    id : Text;
    groupId : Text;
    name : Text;
    targetDate : Time.Time;
    description : Text;
    status : MilestoneStatus;
    image : ?Storage.ExternalBlob;
  };

  public type MilestoneStatus = {
    #pending;
    #completed;
  };

  public type Activity = {
    id : Text;
    groupId : Text;
    activityType : ActivityType;
    timestamp : Time.Time;
    details : Text;
  };

  public type ActivityType = {
    #memberJoined;
    #contributionMade;
    #milestoneUpdated;
    #expenseAdded;
  };

  public type ContributionWithProfile = {
    id : Text;
    groupId : Text;
    member : Principal;
    amount : Int;
    status : ContributionStatus;
    datePaid : ?Time.Time;
    contributorName : Text;
  };

  public type GroupProgress = {
    groupId : Text;
    targetAmount : Int;
    totalContributions : Int;
    totalSpent : Int;
    totalRevenue : Int;
    netProfit : Int;
    remainingBalance : Int;
    perMemberContribution : Int;
    progressPercentage : Int;
    currency : Text;
  };

  public type Payout = {
    id : Text;
    groupId : Text;
    member : Principal;
    amount : Int;
    datePaid : Time.Time;
    markedBy : Principal;
  };

  public type OwnershipPercentage = {
    memberPrincipal : Principal;
    ownershipPercentage : Int;
    totalContributed : Int;
  };

  public type PayoutSuggestion = {
    memberPrincipal : Principal;
    ownershipPercentage : Int;
    payoutAmount : Int;
    isPaid : Bool;
    memberName : Text;
  };

  public type GroupDashboardData = {
    groupId : Text;
    groupInfo : VentureGroup;
    groupProgress : GroupProgress;
    milestones : [Milestone];
    recentContributions : [ContributionWithProfile];
    financialSummary : FinancialSummary;
    activityFeed : [Activity];
  };

  public type FinancialSummary = {
    totalRaised : Int;
    totalSpent : Int;
    totalRevenue : Int;
    remainingBalance : Int;
    netProfit : Int;
    currency : Text;
  };

  public type PlannedPayment = {
    id : Text;
    groupId : Text;
    member : Principal;
    amount : Int;
    dueDate : Time.Time;
    description : Text;
    status : PlannedPaymentStatus;
  };

  public type PlannedPaymentStatus = {
    #upcoming;
    #paid;
    #missed;
  };

  // Helper function to check if caller is a group admin
  private func isGroupAdmin(caller : Principal, groupId : Text) : Bool {
    switch (textMap.get(ventureGroups, groupId)) {
      case (null) { false };
      case (?group) { group.admin == caller };
    };
  };

  // Helper function to check if caller is a group member
  private func isGroupMember(caller : Principal, groupId : Text) : Bool {
    switch (textMap.get(ventureGroups, groupId)) {
      case (null) { false };
      case (?group) {
        if (group.admin == caller) {
          return true;
        };
        Array.find<GroupMember>(
          group.members,
          func(m) { m.principal == caller },
        ) != null;
      };
    };
  };

  public shared ({ caller }) func updateVentureGroup(groupId : Text, updatedGroup : VentureGroup) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can update groups");
    };
    if (not isGroupAdmin(caller, groupId)) {
      Debug.trap("Unauthorized: Only group admins can update group information");
    };
    if (updatedGroup.id != groupId) {
      Debug.trap("Invalid: Group ID cannot be changed");
    };
    validateAmount(updatedGroup.monthlyContributionAmount);
    validateAmount(updatedGroup.targetAmount);
    ventureGroups := textMap.put(ventureGroups, groupId, updatedGroup);
  };

  public query ({ caller }) func getVentureGroup(id : Text) : async ?VentureGroup {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can view group details");
    };
    textMap.get(ventureGroups, id);
  };

  public query ({ caller }) func getAllVentureGroups() : async [VentureGroup] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can view groups");
    };
    Iter.toArray(textMap.vals(ventureGroups));
  };

  public query ({ caller }) func getMyVentureGroups() : async [Text] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can view their groups");
    };
    switch (principalMap.get(userGroups, caller)) {
      case (null) { [] };
      case (?groupIds) { groupIds };
    };
  };

  public shared ({ caller }) func joinVentureGroup(groupId : Text) : async {
    wasNewMember : Bool;
    group : ?VentureGroup;
    userGroups : [Text];
  } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can join groups");
    };

    switch (textMap.get(ventureGroups, groupId)) {
      case (null) { Debug.trap("Group not found") };
      case (?group) {

        let alreadyMember = isGroupMember(caller, groupId);

        if (alreadyMember) {
          switch (principalMap.get(userGroups, caller)) {
            case (null) { return { wasNewMember = false; group = ?group; userGroups = [] } };
            case (?groupIds) { return { wasNewMember = false; group = ?group; userGroups = groupIds } };
          };
        };

        let newMember : GroupMember = {
          principal = caller;
          role = #user;
          joinedDate = Time.now();
        };
        let updatedMembers = Array.append(group.members, [newMember]);
        let updatedGroup = {
          group with
          members = updatedMembers;
        };
        ventureGroups := textMap.put(ventureGroups, groupId, updatedGroup);

        // Update user's group list
        let currentGroups = switch (principalMap.get(userGroups, caller)) {
          case (null) { [] };
          case (?groups) { groups };
        };

        // Check if group ID already exists in user's group list
        let groupExists = Array.find<Text>(currentGroups, func(g) { g == groupId }) != null;

        if (not groupExists) {
          let updatedGroups = Array.append(currentGroups, [groupId]);
          userGroups := principalMap.put(userGroups, caller, updatedGroups);
        } else {
          userGroups := principalMap.put(userGroups, caller, currentGroups);
        };

        { wasNewMember = true; group = ?updatedGroup; userGroups = switch (principalMap.get(userGroups, caller)) { case (?groups) { groups }; case (null) { [] } } };
      };
    };
  };

  public type JoinGroupResult = {
    wasNewMember : Bool;
    group : ?VentureGroup;
    userGroups : [Text];
  };

  func validateAmount(amount : Int) {
    if (amount < 0) {
      Debug.trap("Amount cannot be negative");
    };
    let allowedMinCents = 1; // Minimum allowed is 1 cent
    let allowedMaxCents = 10_000_000; // 10 million in cents

    if (amount < allowedMinCents or amount > allowedMaxCents) {
      Debug.trap("Amount must be in cents (1-10,000,000)");
    };
    let maxAmountWithDecimal = 100; // 1 dollar/euro with decimal cents

    if (amount > 0 and amount < maxAmountWithDecimal) {
      Debug.trap("Amount must be specified in cents, not decimal values");
    };
  };

  public shared ({ caller }) func addContribution(contribution : Contribution) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can add contributions");
    };
    if (not isGroupMember(caller, contribution.groupId)) {
      Debug.trap("Unauthorized: Only group members can add contributions");
    };
    if (contribution.member != caller) {
      Debug.trap("Invalid: You can only add contributions for yourself");
    };
    validateAmount(contribution.amount);
    contributions := textMap.put(contributions, contribution.id, contribution);
  };

  public shared ({ caller }) func updateContribution(contributionId : Text, updatedContribution : Contribution) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can update contributions");
    };
    switch (textMap.get(contributions, contributionId)) {
      case (null) { Debug.trap("Contribution not found") };
      case (?existing) {
        if (existing.member != caller) {
          Debug.trap("Unauthorized: You can only update your own contributions");
        };
        if (not isGroupMember(caller, existing.groupId)) {
          Debug.trap("Unauthorized: Only group members can update contributions");
        };
        if (updatedContribution.id != contributionId or updatedContribution.groupId != existing.groupId) {
          Debug.trap("Invalid: Contribution ID and Group ID cannot be changed");
        };
        if (updatedContribution.member != caller) {
          Debug.trap("Invalid: You can only update your own contributions");
        };
        validateAmount(updatedContribution.amount);
        contributions := textMap.put(contributions, contributionId, updatedContribution);
      };
    };
  };

  public shared ({ caller }) func deleteContribution(contributionId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can delete contributions");
    };
    switch (textMap.get(contributions, contributionId)) {
      case (null) { Debug.trap("Contribution not found") };
      case (?contribution) {
        if (contribution.member != caller) {
          Debug.trap("Unauthorized: You can only delete your own contributions");
        };
        contributions := textMap.delete(contributions, contributionId);
      };
    };
  };

  public query ({ caller }) func getContributionsByGroup(groupId : Text) : async [Contribution] {
    if (not isGroupMember(caller, groupId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only group members can view contributions");
    };
    let groupContributions = List.filter<Contribution>(
      List.fromArray(Iter.toArray(textMap.vals(contributions))),
      func(c) { c.groupId == groupId },
    );
    List.toArray(groupContributions);
  };

  public query ({ caller }) func getContributionsWithProfilesByGroup(groupId : Text) : async [ContributionWithProfile] {
    if (not isGroupMember(caller, groupId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only group members can view contributions");
    };

    let groupContributions = List.filter<Contribution>(
      List.fromArray(Iter.toArray(textMap.vals(contributions))),
      func(c) { c.groupId == groupId },
    );

    let contributionsWithProfiles = List.map<Contribution, ContributionWithProfile>(
      groupContributions,
      func(contribution) {
        let contributorName = switch (principalMap.get(userProfiles, contribution.member)) {
          case (null) { Principal.toText(contribution.member) };
          case (?profile) { profile.name };
        };
        {
          contribution with
          contributorName;
        };
      },
    );

    List.toArray(contributionsWithProfiles);
  };

  public shared ({ caller }) func addExpense(expense : Expense) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can add expenses");
    };
    if (not isGroupMember(caller, expense.groupId)) {
      Debug.trap("Unauthorized: Only group members can add expenses");
    };
    if (expense.addedBy != caller) {
      Debug.trap("Invalid: You can only add expenses as yourself");
    };
    validateAmount(expense.amount);
    expenses := textMap.put(expenses, expense.id, expense);
  };

  public shared ({ caller }) func deleteExpense(expenseId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can delete expenses");
    };
    switch (textMap.get(expenses, expenseId)) {
      case (null) { Debug.trap("Expense not found") };
      case (?expense) {
        if (expense.addedBy != caller and not isGroupAdmin(caller, expense.groupId)) {
          Debug.trap("Unauthorized: You can only delete your own expenses or be an admin");
        };
        expenses := textMap.delete(expenses, expenseId);
      };
    };
  };

  public query ({ caller }) func getExpensesByGroup(groupId : Text) : async [Expense] {
    if (not isGroupMember(caller, groupId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only group members can view expenses");
    };
    let groupExpenses = List.filter<Expense>(
      List.fromArray(Iter.toArray(textMap.vals(expenses))),
      func(e) { e.groupId == groupId },
    );
    List.toArray(groupExpenses);
  };

  public shared ({ caller }) func addRevenue(groupId : Text, revenue : Revenue) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can add revenue");
    };
    if (not isGroupAdmin(caller, groupId)) {
      Debug.trap("Unauthorized: Only group admins can add revenue entries");
    };
    if (revenue.groupId != groupId) {
      Debug.trap("Invalid: Revenue groupId must match the provided groupId");
    };
    if (revenue.addedBy != caller) {
      Debug.trap("Invalid: You can only add revenue as yourself");
    };
    validateAmount(revenue.amount);
    revenues := textMap.put(revenues, revenue.id, revenue);
  };

  public query ({ caller }) func getRevenuesByGroup(groupId : Text) : async [Revenue] {
    if (not isGroupMember(caller, groupId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only group members can view revenues");
    };
    let groupRevenues = List.filter<Revenue>(
      List.fromArray(Iter.toArray(textMap.vals(revenues))),
      func(r) { r.groupId == groupId },
    );
    List.toArray(groupRevenues);
  };

  public query ({ caller }) func getGroupProgress(groupId : Text) : async ?GroupProgress {
    if (not isGroupMember(caller, groupId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only group members can view group progress");
    };

    switch (textMap.get(ventureGroups, groupId)) {
      case (null) { null };
      case (?group) {
        let groupContributions = List.filter<Contribution>(
          List.fromArray(Iter.toArray(textMap.vals(contributions))),
          func(c) { c.groupId == groupId and c.status == #paid },
        );

        let totalContributions = List.foldLeft<Contribution, Int>(
          groupContributions,
          0,
          func(acc, c) { acc + c.amount },
        );

        let groupExpenses = List.filter<Expense>(
          List.fromArray(Iter.toArray(textMap.vals(expenses))),
          func(e) { e.groupId == groupId },
        );

        let totalSpent = List.foldLeft<Expense, Int>(
          groupExpenses,
          0,
          func(acc, e) { acc + e.amount },
        );

        let groupRevenues = List.filter<Revenue>(
          List.fromArray(Iter.toArray(textMap.vals(revenues))),
          func(r) { r.groupId == groupId },
        );

        let totalRevenue = List.foldLeft<Revenue, Int>(
          groupRevenues,
          0,
          func(acc, r) { acc + r.amount },
        );

        let remainingBalance = totalContributions - totalSpent;
        let netProfit : Int = totalRevenue - totalSpent;

        let memberCount = if (group.members.size() == 0) { 1 } else {
          group.members.size();
        };
        let perMemberContribution = if (memberCount == 0) { 0 } else {
          group.targetAmount / Int.abs(memberCount);
        };
        let progressPercentage = if (group.targetAmount == 0) { 0 } else {
          (totalContributions * 100) / Int.abs(group.targetAmount);
        };

        ?{
          groupId;
          targetAmount = group.targetAmount;
          totalContributions;
          totalSpent;
          totalRevenue;
          netProfit;
          remainingBalance;
          perMemberContribution;
          progressPercentage;
          currency = group.currency;
        };
      };
    };
  };

  public query ({ caller }) func getFinancialSummaryByGroup(groupId : Text) : async FinancialSummary {
    if (not isGroupMember(caller, groupId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only group members can view financial summary");
    };

    switch (textMap.get(ventureGroups, groupId)) {
      case (null) { Debug.trap("Group not found") };
      case (?group) {
        let groupContributions = List.filter<Contribution>(
          List.fromArray(Iter.toArray(textMap.vals(contributions))),
          func(c) { c.groupId == groupId and c.status == #paid },
        );

        let totalRaised = List.foldLeft<Contribution, Int>(
          groupContributions,
          0,
          func(acc, c) { acc + c.amount },
        );

        let groupExpenses = List.filter<Expense>(
          List.fromArray(Iter.toArray(textMap.vals(expenses))),
          func(e) { e.groupId == groupId },
        );

        let totalSpent = List.foldLeft<Expense, Int>(
          groupExpenses,
          0,
          func(acc, e) { acc + e.amount },
        );

        let groupRevenues = List.filter<Revenue>(
          List.fromArray(Iter.toArray(textMap.vals(revenues))),
          func(r) { r.groupId == groupId },
        );

        let totalRevenue = List.foldLeft<Revenue, Int>(
          groupRevenues,
          0,
          func(acc, r) { acc + r.amount },
        );

        let remainingBalance = totalRaised - totalSpent;
        let netProfit : Int = totalRevenue - totalSpent;

        {
          totalRaised;
          totalSpent;
          totalRevenue;
          remainingBalance;
          netProfit;
          currency = group.currency;
        };
      };
    };
  };

  public shared ({ caller }) func addMilestone(milestone : Milestone) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can add milestones");
    };
    if (not isGroupAdmin(caller, milestone.groupId)) {
      Debug.trap("Unauthorized: Only group admins can create milestones");
    };
    milestones := textMap.put(milestones, milestone.id, milestone);
  };

  public shared ({ caller }) func updateMilestoneStatus(milestoneId : Text, status : MilestoneStatus) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can update milestones");
    };
    switch (textMap.get(milestones, milestoneId)) {
      case (null) { Debug.trap("Milestone not found") };
      case (?milestone) {
        if (not isGroupAdmin(caller, milestone.groupId)) {
          Debug.trap("Unauthorized: Only group admins can update milestone status");
        };
        let updatedMilestone = {
          milestone with
          status;
        };
        milestones := textMap.put(milestones, milestoneId, updatedMilestone);
      };
    };
  };

  public query ({ caller }) func getMilestonesByGroup(groupId : Text) : async [Milestone] {
    if (not isGroupMember(caller, groupId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only group members can view milestones");
    };
    let groupMilestones = List.filter<Milestone>(
      List.fromArray(Iter.toArray(textMap.vals(milestones))),
      func(m) { m.groupId == groupId },
    );
    List.toArray(groupMilestones);
  };

  public shared ({ caller }) func addActivity(activity : Activity) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can add activities");
    };
    if (not isGroupAdmin(caller, activity.groupId)) {
      Debug.trap("Unauthorized: Only group admins can add activities");
    };
    activityFeed := List.push(activity, activityFeed);
  };

  public query ({ caller }) func getActivityFeedByGroup(groupId : Text) : async [Activity] {
    if (not isGroupMember(caller, groupId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only group members can view activity feed");
    };
    let groupActivities = List.filter<Activity>(
      activityFeed,
      func(a) { a.groupId == groupId },
    );
    List.toArray(groupActivities);
  };

  public shared ({ caller }) func uploadMilestoneImage(milestoneId : Text, blob : Storage.ExternalBlob) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can upload images");
    };
    switch (textMap.get(milestones, milestoneId)) {
      case (null) { Debug.trap("Milestone not found") };
      case (?milestone) {
        if (not isGroupAdmin(caller, milestone.groupId)) {
          Debug.trap("Unauthorized: Only group admins can upload milestone images");
        };
        let updatedMilestone = {
          milestone with
          image = ?blob;
        };
        milestones := textMap.put(milestones, milestoneId, updatedMilestone);
      };
    };
  };

  public shared ({ caller }) func uploadReceiptImage(expenseId : Text, blob : Storage.ExternalBlob) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can upload receipt images");
    };
    switch (textMap.get(expenses, expenseId)) {
      case (null) { Debug.trap("Expense not found") };
      case (?expense) {
        if (not isGroupMember(caller, expense.groupId)) {
          Debug.trap("Unauthorized: Only group members can upload receipt images");
        };
        let updatedExpense = {
          expense with
          receiptImage = ?blob;
        };
        expenses := textMap.put(expenses, expenseId, updatedExpense);
      };
    };
  };

  public query ({ caller }) func calculateOwnershipPercentages(groupId : Text) : async [OwnershipPercentage] {
    if (not isGroupMember(caller, groupId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only group members can view ownership percentages");
    };

    switch (textMap.get(ventureGroups, groupId)) {
      case (null) { Debug.trap("Group not found") };
      case (?group) {
        let groupContributions = List.filter<Contribution>(
          List.fromArray(Iter.toArray(textMap.vals(contributions))),
          func(c) { c.groupId == groupId and c.status == #paid },
        );

        let totalGroupContributions = List.foldLeft<Contribution, Int>(
          groupContributions,
          0,
          func(acc, c) { acc + c.amount },
        );

        if (totalGroupContributions == 0) {
          return [];
        };

        let ownershipList = Array.map<GroupMember, OwnershipPercentage>(
          group.members,
          func(member) {
            let memberContributions = List.filter<Contribution>(
              groupContributions,
              func(c) { c.member == member.principal },
            );

            let totalMemberContributions = List.foldLeft<Contribution, Int>(
              memberContributions,
              0,
              func(acc, c) { acc + c.amount },
            );

            let ownershipPercentage = if (totalGroupContributions == 0) { 0 } else {
              (totalMemberContributions * 100) / Int.abs(totalGroupContributions);
            };

            {
              memberPrincipal = member.principal;
              ownershipPercentage;
              totalContributed = totalMemberContributions;
            };
          },
        );

        ownershipList;
      };
    };
  };

  public shared ({ caller }) func recordPayout(groupId : Text, member : Principal, amount : Int) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can record payouts");
    };
    if (not isGroupAdmin(caller, groupId)) {
      Debug.trap("Unauthorized: Only group admins can record payouts");
    };

    switch (textMap.get(ventureGroups, groupId)) {
      case (null) { Debug.trap("Group not found") };
      case (?group) {
        let isMember = group.admin == member or Array.find<GroupMember>(
          group.members,
          func(m) { m.principal == member },
        ) != null;

        if (not isMember) {
          Debug.trap("Invalid: Member does not belong to this group");
        };

        validateAmount(amount);

        let payoutId = Text.concat(groupId, Text.concat("-", Principal.toText(member)));
        let newPayout : Payout = {
          id = payoutId;
          groupId;
          member;
          amount;
          datePaid = Time.now();
          markedBy = caller;
        };

        payouts := textMap.put(payouts, payoutId, newPayout);
      };
    };
  };

  public query ({ caller }) func calculatePayouts(groupId : Text) : async [PayoutSuggestion] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can calculate payouts");
    };
    if (not isGroupAdmin(caller, groupId)) {
      Debug.trap("Unauthorized: Only group admins can calculate payouts");
    };

    switch (textMap.get(ventureGroups, groupId)) {
      case (null) { Debug.trap("Group not found") };
      case (?group) {
        let groupContributions = List.filter<Contribution>(
          List.fromArray(Iter.toArray(textMap.vals(contributions))),
          func(c) { c.groupId == groupId and c.status == #paid },
        );

        let totalGroupContributions = List.foldLeft<Contribution, Int>(
          groupContributions,
          0,
          func(acc, c) { acc + c.amount },
        );

        let groupRevenues = List.filter<Revenue>(
          List.fromArray(Iter.toArray(textMap.vals(revenues))),
          func(r) { r.groupId == groupId },
        );

        let totalGroupRevenue = List.foldLeft<Revenue, Int>(
          groupRevenues,
          0,
          func(acc, r) { acc + r.amount },
        );

        if (totalGroupContributions == 0 or totalGroupRevenue == 0) {
          return [];
        };

        Array.map<GroupMember, PayoutSuggestion>(
          group.members,
          func(member) {
            let memberContributions = List.filter<Contribution>(
              groupContributions,
              func(c) { c.member == member.principal },
            );

            let totalMemberContributions = List.foldLeft<Contribution, Int>(
              memberContributions,
              0,
              func(acc, c) { acc + c.amount },
            );

            let ownershipPercentage = if (totalGroupContributions == 0) { 0 } else {
              (totalMemberContributions * 100) / Int.abs(totalGroupContributions);
            };

            let payoutAmount = (totalGroupRevenue * ownershipPercentage) / 100;

            let memberName = switch (principalMap.get(userProfiles, member.principal)) {
              case (null) { Principal.toText(member.principal) };
              case (?profile) { profile.name };
            };

            let memberPayouts = List.filter<Payout>(
              List.fromArray(Iter.toArray(textMap.vals(payouts))),
              func(p) { p.groupId == groupId and p.member == member.principal },
            );

            let totalPaid = List.foldLeft<Payout, Int>(
              memberPayouts,
              0,
              func(acc, p) { acc + p.amount },
            );

            let isPaid = totalPaid >= payoutAmount;

            {
              memberPrincipal = member.principal;
              ownershipPercentage;
              payoutAmount;
              isPaid;
              memberName;
            };
          },
        );
      };
    };
  };

  public query ({ caller }) func getPayoutsByGroup(groupId : Text) : async [Payout] {
    if (not isGroupMember(caller, groupId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only group members can view payout history");
    };
    let groupPayouts = List.filter<Payout>(
      List.fromArray(Iter.toArray(textMap.vals(payouts))),
      func(p) { p.groupId == groupId },
    );
    List.toArray(groupPayouts);
  };

  public query ({ caller }) func getMyReturns(groupId : Text) : async {
    totalContributed : Int;
    totalReceived : Int;
    netProfit : Int;
  } {
    if (not isGroupMember(caller, groupId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only group members can view their returns");
    };

    let userContributions = List.filter<Contribution>(
      List.fromArray(Iter.toArray(textMap.vals(contributions))),
      func(c) { c.groupId == groupId and c.member == caller and c.status == #paid },
    );

    let totalContributed = List.foldLeft<Contribution, Int>(
      userContributions,
      0,
      func(acc, c) { acc + c.amount },
    );

    let userPayouts = List.filter<Payout>(
      List.fromArray(Iter.toArray(textMap.vals(payouts))),
      func(p) { p.groupId == groupId and p.member == caller },
    );

    let totalReceived = List.foldLeft<Payout, Int>(
      userPayouts,
      0,
      func(acc, p) { acc + p.amount },
    );

    let netProfit : Int = totalReceived - totalContributed;

    {
      totalContributed;
      totalReceived;
      netProfit;
    };
  };

  public query ({ caller }) func getGroupDashboardData(groupId : Text) : async GroupDashboardData {
    if (not isGroupMember(caller, groupId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only group members can access group dashboard");
    };

    switch (textMap.get(ventureGroups, groupId)) {
      case (null) { Debug.trap("Group not found") };
      case (?group) {
        let groupContributions = List.filter<Contribution>(
          List.fromArray(Iter.toArray(textMap.vals(contributions))),
          func(c) { c.groupId == groupId and c.status == #paid },
        );

        let totalContributions = List.foldLeft<Contribution, Int>(
          groupContributions,
          0,
          func(acc, c) { acc + c.amount },
        );

        let groupExpenses = List.filter<Expense>(
          List.fromArray(Iter.toArray(textMap.vals(expenses))),
          func(e) { e.groupId == groupId },
        );

        let totalSpent = List.foldLeft<Expense, Int>(
          groupExpenses,
          0,
          func(acc, e) { acc + e.amount },
        );

        let groupRevenues = List.filter<Revenue>(
          List.fromArray(Iter.toArray(textMap.vals(revenues))),
          func(r) { r.groupId == groupId },
        );

        let totalRevenue = List.foldLeft<Revenue, Int>(
          groupRevenues,
          0,
          func(acc, r) { acc + r.amount },
        );

        let remainingBalance = totalContributions - totalSpent;
        let netProfit : Int = totalRevenue - totalSpent;

        let memberCount = if (group.members.size() == 0) { 1 } else {
          group.members.size();
        };
        let perMemberContribution = if (memberCount == 0) { 0 } else {
          group.targetAmount / Int.abs(memberCount);
        };
        let progressPercentage = if (group.targetAmount == 0) { 0 } else {
          (totalContributions * 100) / Int.abs(group.targetAmount);
        };

        let recentContributions = List.take<Contribution>(
          List.reverse<Contribution>(groupContributions),
          10,
        );

        let recentContributionsWithProfiles = List.map<Contribution, ContributionWithProfile>(
          recentContributions,
          func(contribution) {
            let contributorName = switch (principalMap.get(userProfiles, contribution.member)) {
              case (null) { Principal.toText(contribution.member) };
              case (?profile) { profile.name };
            };
            {
              contribution with
              contributorName;
            };
          },
        );

        let groupMilestones = List.filter<Milestone>(
          List.fromArray(Iter.toArray(textMap.vals(milestones))),
          func(m) { m.groupId == groupId },
        );

        let groupActivities = List.filter<Activity>(
          activityFeed,
          func(a) { a.groupId == groupId },
        );

        let groupProgress : GroupProgress = {
          groupId;
          targetAmount = group.targetAmount;
          totalContributions;
          totalSpent;
          totalRevenue;
          netProfit;
          remainingBalance;
          perMemberContribution;
          progressPercentage;
          currency = group.currency;
        };

        let financialSummary : FinancialSummary = {
          totalRaised = totalContributions;
          totalSpent;
          totalRevenue;
          remainingBalance;
          netProfit;
          currency = group.currency;
        };

        {
          groupId;
          groupInfo = group;
          groupProgress;
          milestones = List.toArray(groupMilestones);
          recentContributions = List.toArray(recentContributionsWithProfiles);
          financialSummary;
          activityFeed = List.toArray(groupActivities);
        };
      };
    };
  };

  public shared ({ caller }) func generateInviteCode() : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can generate invite codes");
    };
    let blob = await Random.blob();
    let code = InviteLinksModule.generateUUID(blob);
    InviteLinksModule.generateInviteCode(inviteState, code);
    code;
  };

  public func submitRSVP(name : Text, attending : Bool, inviteCode : Text) : async () {
    InviteLinksModule.submitRSVP(inviteState, name, attending, inviteCode);
  };

  public query ({ caller }) func getAllRSVPs() : async [InviteLinksModule.RSVP] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can view RSVPs");
    };
    InviteLinksModule.getAllRSVPs(inviteState);
  };

  public query ({ caller }) func getInviteCodes() : async [InviteLinksModule.InviteCode] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can view invite codes");
    };
    InviteLinksModule.getInviteCodes(inviteState);
  };

  // Planned Payments Functions
  public shared ({ caller }) func createPlannedPayment(payment : PlannedPayment) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can create planned payments");
    };

    // Check if caller is group admin or the member for whom the payment is being created
    let isAdmin = isGroupAdmin(caller, payment.groupId);
    let isOwnPayment = payment.member == caller;

    if (not isAdmin and not isOwnPayment) {
      Debug.trap("Unauthorized: Only group admins can create planned payments for other members");
    };

    if (not isGroupMember(caller, payment.groupId)) {
      Debug.trap("Unauthorized: Only group members can create planned payments");
    };

    // Verify that the payment member is actually a member of the group
    if (not isGroupMember(payment.member, payment.groupId)) {
      Debug.trap("Invalid: Payment member must be a member of the group");
    };

    validateAmount(payment.amount);
    plannedPayments := textMap.put(plannedPayments, payment.id, payment);
  };

  public shared ({ caller }) func updatePlannedPayment(paymentId : Text, updatedPayment : PlannedPayment) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can update planned payments");
    };
    switch (textMap.get(plannedPayments, paymentId)) {
      case (null) { Debug.trap("Planned payment not found") };
      case (?existing) {
        // Check if caller is group admin or the member who owns the payment
        let isAdmin = isGroupAdmin(caller, existing.groupId);
        let isOwner = existing.member == caller;

        if (not isAdmin and not isOwner) {
          Debug.trap("Unauthorized: Only group admins or payment owners can update planned payments");
        };

        if (not isGroupMember(caller, existing.groupId)) {
          Debug.trap("Unauthorized: Only group members can update planned payments");
        };
        if (updatedPayment.id != paymentId or updatedPayment.groupId != existing.groupId) {
          Debug.trap("Invalid: Planned payment ID and Group ID cannot be changed");
        };
        if (updatedPayment.member != existing.member) {
          Debug.trap("Invalid: Payment member cannot be changed");
        };
        validateAmount(updatedPayment.amount);
        plannedPayments := textMap.put(plannedPayments, paymentId, updatedPayment);
      };
    };
  };

  public query ({ caller }) func getPlannedPaymentsByGroup(groupId : Text) : async [PlannedPayment] {
    if (not isGroupMember(caller, groupId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only group members can view planned payments");
    };
    let groupPlannedPayments = List.filter<PlannedPayment>(
      List.fromArray(Iter.toArray(textMap.vals(plannedPayments))),
      func(p) { p.groupId == groupId },
    );
    List.toArray(groupPlannedPayments);
  };

  public query ({ caller }) func getMyPlannedPayments() : async [PlannedPayment] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view their planned payments");
    };
    let myPlannedPayments = List.filter<PlannedPayment>(
      List.fromArray(Iter.toArray(textMap.vals(plannedPayments))),
      func(p) { p.member == caller },
    );
    List.toArray(myPlannedPayments);
  };

  let oneDayNanos = 24 * 60 * 60 * 1_000_000_000;
  let oneWeekNanos = oneDayNanos * 7;

  func runDailyTasks() : async () {};
  func runWeeklyTasks() : async () {};

  transient let _dailyTimer = Timer.recurringTimer<system>(#nanoseconds(oneDayNanos), func() : async () { await runDailyTasks() });
  transient let _weeklyTimer = Timer.recurringTimer<system>(#nanoseconds(oneWeekNanos), func() : async () { await runWeeklyTasks() });
};

