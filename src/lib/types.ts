export type PaginatedMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  mode?: "offset" | "keyset";
  hasMore?: boolean;
  nextCursor?: string | null;
  prevCursor?: string | null;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: PaginatedMeta;
};

export type UserRole = "admin" | "client" | "platform_admin";

export type AuthUser = {
  username: string;
  role: UserRole;
  displayName: string;
  tenantSlug?: string;
  tenantName?: string;
  email?: string;
};

export type ScheduleEntry = {
  id: string;
  plate: string;
  cls: string;
  dest: string;
  runType: "Morning" | "Afternoon";
  rate: number;
  days: number;
  cost: number;
  vat: number;
  total: number;
  month: string;
  serviceDate?: string;
  status: "saved" | "draft";
};

export type Vehicle = {
  id: string;
  plate: string;
  cls: string;
  runType: string;
  runs: number;
  days: number;
  total: number;
  dests: string[];
  status: "active" | "inactive" | "suspended";
  client: string;
  createdAt?: string;
};

export type InvoiceStatus = "draft" | "sent" | "approved" | "paid" | "pending" | "rejected";

export type Invoice = {
  id: string;
  invoiceNo: string;
  plate: string;
  cls: string;
  route: string;
  days: number;
  net: number;
  vat: number;
  total: number;
  status: InvoiceStatus;
  serviceDate?: string;
  period?: string;
  periodStart?: string;
  periodEnd?: string;
  deliveryNoteNo?: string;
  clientNote?: string;
  workTicketId?: string;
  consolidatedInvoiceId?: string;
  createdAt?: string;
};

export type Rate = {
  id: string;
  route: string;
  cls: string;
  rate: number;
  effectiveFrom: string;
  status: "active" | "inactive";
  category: "nairobi" | "upcountry";
};

export type LocalDelivery = {
  id: string;
  reg: string;
  m: number;
  a: number;
  total: number;
  serviceDate?: string;
  period?: string;
};

export type SafariFlag = "" | "VERIFY" | "DAY";

export type SafariEntry = {
  id: string;
  reg: string;
  total: number;
  flag: SafariFlag;
  dest: string;
  serviceDate?: string;
  period?: string;
};

export type WorkTicketStatus = "draft" | "sent" | "approved" | "rejected" | "invoiced";

export type ConsolidatedInvoiceStatus = "draft" | "pending_approval" | "approved" | "paid" | "rejected";

export type WorkTicketJourneyLeg = {
  id: string;
  details: string;
  openingMileage: number;
  timeOut: string;
  officerAuthorising: string;
  fuelDrawn: string;
  timeIn: string;
  closingMileage: number;
  serviceDone: string;
  officerConfirming: string;
  journeyType: string;
};

export type WorkTicketVehicleCondition = {
  petrolDiesel: string;
  oil: string;
  seatBelt: string;
  water: string;
  battery: string;
  tyres: string;
  safety: string;
  triangles: string;
  body: string;
  spareWheel: string;
  fireExtinguisher: string;
  tools: string;
};

export type WorkTicketRateType = "fixed" | "per_km";

export type WorkTicket = {
  id: string;
  serialNo: string;
  branch: string;
  tripDate: string;
  plate: string;
  make: string;
  vehicleType: string;
  driverName: string;
  route: string;
  rateType: WorkTicketRateType;
  agreedRate: number;
  gatePassRef?: string;
  headerNotes?: string;
  legs: WorkTicketJourneyLeg[];
  vehicleCondition: WorkTicketVehicleCondition;
  privateKm: number;
  officialKm: number;
  net: number;
  vat: number;
  total: number;
  driverSignature?: string;
  certificationDate?: string;
  attachmentName?: string;
  status: WorkTicketStatus;
  clientNote?: string;
  consolidatedInvoiceId?: string;
};

export type SoaLineItem = {
  workTicketId: string;
  tripDate: string;
  serialNo: string;
  plate: string;
  route: string;
  driverName: string;
  gatePassRef: string;
  amount: number;
};

export type ConsolidatedInvoice = {
  id: string;
  invoiceNo: string;
  refNo: string;
  periodStart: string;
  periodEnd: string;
  invoiceDate: string;
  description: string;
  paymentTermsDays: number;
  paymentWindowFrom?: string;
  paymentWindowTo?: string;
  totalTrips: number;
  net: number;
  vat: number;
  total: number;
  status: ConsolidatedInvoiceStatus;
  workTicketIds: string[];
  plate?: string;
  consolidationType?: "vehicle" | "period";
  filterMeta?: {
    route?: string;
    cls?: string;
    runType?: string;
    groupBy?: string;
  };
  clientNote?: string;
  revisedFromId?: string;
  supersededById?: string;
  etimsStatus?: string;
  etimsRef?: string;
  etimsUrl?: string;
  approvedAt?: string;
  paidAt?: string;
  createdAt?: string;
};

export type RouteRecord = {
  id: string;
  name: string;
  rate7: number;
  rate15: number;
  category: "nairobi" | "upcountry";
  trips: number;
  total: number;
  status: "active" | "inactive";
};

export type BillingParty = {
  name: string;
  legalName?: string;
  address: string;
  city?: string;
  phone?: string;
  vatNo?: string;
  pin: string;
  contact?: string;
  email?: string;
  contractRef?: string;
};

export type BillingProfile = {
  supplier: BillingParty;
  client: BillingParty;
};

export type ExpenseCategory =
  | "fuel"
  | "maintenance"
  | "insurance"
  | "salaries"
  | "tolls"
  | "other";

export type Expense = {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  vehiclePlate?: string;
  month: string;
  status: "recorded" | "approved" | "paid";
};

export type EtimsValidationResult = {
  invoiceId: string;
  invoiceNo: string;
  status: "valid" | "pending" | "failed" | "submitted";
  kraReference?: string;
  cuInvoiceNumber?: string;
  etimsUrl?: string;
  digitaxSaleId?: string;
  validatedAt: string;
  checks: { label: string; passed: boolean; detail?: string }[];
  message?: string;
};

export type FleetData = {
  schedules: ScheduleEntry[];
  vehicles: Vehicle[];
  invoices: Invoice[];
  rates: Rate[];
  localDeliveries: LocalDelivery[];
  safari: SafariEntry[];
  routes: RouteRecord[];
  workTickets: WorkTicket[];
  consolidatedInvoices: ConsolidatedInvoice[];
  notifications: WorkflowNotification[];
  expenses: Expense[];
  billingProfile: BillingProfile;
};

export type NotificationAudience = "admin" | "client";

export type WorkflowEventType =
  | "invoice_sent"
  | "invoice_approved"
  | "invoice_rejected"
  | "invoice_paid"
  | "soa_sent"
  | "soa_approved"
  | "work_ticket_sent"
  | "work_ticket_approved"
  | "consolidated_sent"
  | "consolidated_approved"
  | "consolidated_paid"
  | "consolidated_rejected"
  | "etims_filing_shared"
  | "etims_submitted"
  | "work_ticket_rejected";

export type WorkflowNotification = {
  id: string;
  audience: NotificationAudience;
  type: WorkflowEventType;
  title: string;
  message: string;
  refId?: string;
  read: boolean;
  createdAt: string;
  actor: "admin" | "client" | "system";
};
