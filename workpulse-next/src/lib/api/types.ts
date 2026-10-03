export interface AuthResponse {
  token: string;
  refreshToken: string;
  expiresAt: string;
  displayName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginResult {
  requiresTwoFactor: boolean;
  email: string | null;
  auth: AuthResponse | null;
}

export interface RegisterResult {
  registrationId: string;
  email: string;
}

export interface CurrentUser {
  email: string;
  displayName: string;
  twoFactorEnabled: boolean;
}

export interface UserSession {
  id: string;
  deviceLabel: string;
  ipAddress: string | null;
  createdUtc: string;
  lastUsedUtc: string;
}

export type DayType =
  | "WorkDay"
  | "HalfDayLeave"
  | "AMLeave"
  | "PMLeave"
  | "HourlyLeave"
  | "AnnualPaidLeave"
  | "UnpaidLeave"
  | "PublicHoliday"
  | "Weekend"
  | "BusinessTrip"
  | "Other";

export interface AttendanceRecord {
  date: string;
  dayType: DayType;
  holidayName?: string | null;
  tripCategory?: "Domestic" | "Overseas" | null;
  tripRegion?: string | null;
  leaveHours?: number | null;
  leaveMinutes?: number | null;
  loginTime?: string | null;
  logoutTime?: string | null;
  overtimeHours: number;
  overtimeMinutes: number;
  isOvertime: boolean;
  isOvertimeDecided: boolean;
}

export interface MonthlyData {
  year: number;
  month: number;
  monthLabel: string;
  title: string;
  // Overrides the default 21st-to-20th (weekend-adjusted) settlement window — undefined/null
  // means "use the default calculation." Both must be set together; a partial override is
  // treated as none (see settlement-period.ts's effectiveSettlementPeriod).
  customSettlementStart?: string | null;
  customSettlementEnd?: string | null;
  records: AttendanceRecord[];
  lastModifiedUtc?: string;
}

export interface YearMonthDto {
  year: number;
  month: number;
  label: string;
}

export interface DailyReport {
  id: string;
  reportDate: string; // yyyy-MM-dd
  title: string;
  body: string;
  lastModifiedUtc?: string;
}

export interface WeeklyReport {
  id: string;
  weekStartDate: string; // yyyy-MM-dd
  title: string;
  body: string;
  lastModifiedUtc?: string;
}

export type TripCategory = "Domestic" | "Overseas";

/** Self-tracked (no second-person approver) — Approved/Settled block deletion server-side. */
export type TripStatus = "Draft" | "Submitted" | "Approved" | "Settled";
export type ReimbursementStatusValue = "Pending" | "Submitted" | "Reimbursed";

/** One row of a Trip Application's repeatable "Trip Details" table. */
export interface TripSegment {
  id: string;
  sequenceNo: number;
  purpose: string;
  content: string;
  projectNo: string;
  destinationName: string;
  placeName: string;
  date1?: string | null;
  date2?: string | null;
}

/** One row of a Trip Application's Budget table (estimated cost). */
export interface TripBudgetLine {
  id: string;
  content: string;
  expenseCategory: string;
  amount: number;
}

export interface TripReport {
  id: string;
  category: TripCategory;
  destination: string;
  startDate: string;
  endDate: string;
  purpose: string;
  notes: string;
  status: TripStatus;
  lastModifiedUtc?: string;
  tripNumber: string;
  departmentCode: string;
  scheduledDeparture?: string | null;
  scheduledReturn?: string | null;
  ticketArrangementRequest: string;
  segments: TripSegment[];
  budgetLines: TripBudgetLine[];
  documentCount: number;
}

/** One row of the Settlement's per-day transportation & travel expense table. */
export interface TripSettlementTransportationLine {
  id: string;
  date?: string | null;
  content: string;
  destinationName: string;
  placeName: string;
  route: string;
  transportMode: string;
  departureTime: string;
  arrivalTime: string;
  gasCost?: number | null;
  tollCost?: number | null;
  transportationCost: number;
  lodgingCost: number;
  dailyAllowance: number;
}

/** One row of the Settlement's "Other" expense table. */
export interface TripSettlementOtherLine {
  id: string;
  date?: string | null;
  content: string;
  description: string;
  departmentCode: string;
  expenseCategoryTaxCode: string;
  settlementAmount: number;
}

export interface TripSettlement {
  tripReportId: string;
  employeeNo: string;
  bankAccountNumber: string;
  bank: string;
  branch: string;
  locationAtSettlement: string;
  region: string;
  accountingCode: string;
  sourceDocumentNo: string;
  transportationLines: TripSettlementTransportationLine[];
  otherLines: TripSettlementOtherLine[];
  lastModifiedUtc?: string;
}

export interface TripDocumentMeta {
  id: string;
  tripReportId: string;
  /** User-created, DB-backed category name — see ReimbursementCategory / reimbursementApi. */
  category: string;
  label: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedUtc: string;
  documentDate?: string | null;
  driveFileId?: string | null;
  driveWebViewLink?: string | null;
  amount?: number | null;
  currency: string;
  reimbursementStatus: ReimbursementStatusValue;
  resourceId?: string | null;
}

export interface TripDocumentWithTrip extends TripDocumentMeta {
  tripDestination: string;
  tripCategory: TripCategory;
  tripStartDate: string;
  tripEndDate: string;
}

export interface ReimbursementCategory {
  id: string;
  name: string;
}

export interface GoogleDriveStatus {
  configured: boolean;
  connected: boolean;
  connectedUtc: string | null;
}

export interface GmailStatus {
  configured: boolean;
  connected: boolean;
  emailAddress: string | null;
  connectedUtc: string | null;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  href: string | null;
  createdUtc: string;
  readUtc: string | null;
}

export interface GmailLabel {
  id: string;
  name: string;
  type: "system" | "user";
  color: string | null;
}

export interface ContactRecord {
  id: string;
  affiliation: string;
  familyName: string;
  givenName: string;
  department: string;
  email: string;
  intercom: string;
  contactNumber: string;
  notes: string;
  lastModifiedUtc?: string;
}

export interface QuickLink {
  id: string;
  label: string;
  url: string;
  category: string;
  keywords: string;
  sortOrder: number;
  lastModifiedUtc?: string;
}

export interface DictLabelDto {
  id: string;
  name: string;
}

export interface AppSettings {
  standardLoginTime: string; // "HH:mm:ss"
  standardLogoutTime: string;
  overtimeBreakDeductionMinutes: number;
  defaultTitle: string;
  lastOpenedMonth?: string | null;
  themeVariant: string;
  fontSizePreset: string;
  dateFormat: string;
  weekStartDay: string; // "Sunday" | "Monday"
  defaultLandingPage: string;
  idleTimeoutMinutes: number; // 0 = disabled
  notificationsEnabled: boolean;
  notificationChannel: string; // "Email" | "In-app"
  accentColor: string; // AccentId — "blue" | "purple" | "teal" | "orange" | "rose" | "green"
  glassIntensity: number; // 0 (clear) - 100 (fully tinted)
}

export type UtilityProvider = "TokyoGas" | "TokyoWater";
export type UtilityPaymentMethod =
  | "PaperSlipConvenienceStore"
  | "PaperSlipBank"
  | "SmartphoneApp"
  | "CreditCard"
  | "WaterworksApp"
  | "DirectDebit";
export type UtilityBillStatus = "Unpaid" | "Paid" | "Overdue";

export interface UtilityBillBreakdown {
  waterCharge?: number | null;
  sewerCharge?: number | null;
  consumptionTax?: number | null;
  slipIssuingFee?: number | null;
  lateInterest?: number | null;
}

export interface UtilityBill {
  id: string;
  provider: UtilityProvider;
  billingYear: number;
  billingMonth: number;
  periodStart?: string | null; // "YYYY-MM-DD"
  periodEnd?: string | null;
  meterReadingDate?: string | null;
  usageAmount?: number | null;
  usageUnit: string;
  sewerUsageAmount?: number | null;
  amountJpy: number;
  breakdown?: UtilityBillBreakdown | null;
  dueDate: string;
  paidDate?: string | null;
  paymentMethod?: UtilityPaymentMethod | null;
  status: UtilityBillStatus; // computed server-side (Asia/Tokyo), never stored
  receiptRef?: string | null;
  notes: string;
  lastModifiedUtc?: string;
  documentCount: number;
}

export interface UtilityBillDocumentMeta {
  id: string;
  utilityBillId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedUtc: string;
  driveFileId?: string | null;
  driveWebViewLink?: string | null;
}

export interface UtilityProviderSettings {
  provider: UtilityProvider;
  customerNumber: string;
  currentPaymentMethod?: UtilityPaymentMethod | null;
  paymentMethodChangedDate?: string | null;
}

export interface UtilityBillSummary {
  totalThisMonth: number;
  yearToDate: number;
  monthlyAverage: number;
  unpaidCount: number;
  overdueCount: number;
  nextDueBill?: UtilityBill | null;
}

export interface UtilityBillMonthlyChartPoint {
  year: number;
  month: number;
  provider: UtilityProvider;
  amount: number;
}

export interface UtilityBillUsageChartPoint {
  year: number;
  month: number;
  provider: UtilityProvider;
  usage: number;
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  isDisabled: boolean;
}

export interface AdminUserCreateRequest {
  email: string;
  displayName: string;
  password: string;
  isAdmin: boolean;
}

export interface AdminUserUpdateRequest {
  email: string;
  displayName: string;
  isAdmin: boolean;
}

export interface AdminUserFeatures {
  catalog: string[];
  disabled: string[];
}

export interface DictEntryDto {
  id: string;
  japanese: string;
  reading?: string | null;
  meaning: string;
  exampleJp?: string | null;
  exampleEn?: string | null;
  notes?: string | null;
  jlptLevel?: string | null;
  createdUtc: string;
  lastModifiedUtc: string;
  labels: DictLabelDto[];
}

export type SharePermission = "Read" | "Edit";
/** Matches the shared item's own entity name — SharesController/ShareAccessService dispatch on
 * this exact string. */
export type ShareableResourceType = "TripReport" | "TripDocument" | "DailyReport" | "WeeklyReport" | "Contact" | "QuickLink" | "Resource" | "UtilityBill";

export interface ShareGrant {
  email: string;
  permission: SharePermission;
}

export interface ShareConfig {
  id?: string;
  resourceType: ShareableResourceType;
  resourceId: string;
  isPublic: boolean;
  publicPermission: SharePermission;
  publicToken?: string | null;
  grants: ShareGrant[];
  /** Request-only — whether to email newly-added people, same as Drive's "Notify people"
   * checkbox. Meaningless on a GET response. */
  notify?: boolean;
}

export interface SharedWithMeItem {
  shareId: string;
  resourceType: ShareableResourceType;
  resourceId: string;
  title: string;
  ownerDisplayName: string;
  permission: SharePermission;
}

export type ResourceType = "Link" | "File" | "Note";

export interface Resource {
  id: string;
  type: ResourceType;
  title: string;
  notes: string;
  url: string | null;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  driveFileId?: string | null;
  driveWebViewLink?: string | null;
  tags: string;
  keywords: string;
  createdUtc: string;
  lastModifiedUtc: string;
}
