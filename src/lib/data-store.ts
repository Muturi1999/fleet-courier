import { buildSeedData } from "./seed";
import { loadPersistedStore, savePersistedStore } from "./store-persistence";
import type {
  FleetData,
  Invoice,
  LocalDelivery,
  Rate,
  RouteRecord,
  SafariEntry,
  ScheduleEntry,
  Vehicle,
  WorkflowNotification,
  WorkTicket,
  ConsolidatedInvoice,
  Expense,
  BillingProfile,
} from "./types";
import { DEFAULT_BILLING_PROFILE } from "./invoice-meta";

type IdEntity = { id: string };

class Collection<T extends IdEntity> {
  private items = new Map<string, T>();

  constructor(initial: T[] = []) {
    initial.forEach((item) => this.items.set(item.id, structuredClone(item)));
  }

  all(): T[] {
    return Array.from(this.items.values());
  }

  get(id: string): T | undefined {
    return this.items.get(id);
  }

  create(data: Omit<T, "id"> & { id?: string }): T {
    const id = data.id ?? crypto.randomUUID();
    const item = { ...data, id } as T;
    this.items.set(id, structuredClone(item));
    return item;
  }

  update(id: string, patch: Partial<T>): T | null {
    const existing = this.items.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch, id } as T;
    this.items.set(id, updated);
    return updated;
  }

  remove(id: string): boolean {
    return this.items.delete(id);
  }
}

class FleetStore {
  schedules: Collection<ScheduleEntry>;
  vehicles: Collection<Vehicle>;
  invoices: Collection<Invoice>;
  rates: Collection<Rate>;
  localDeliveries: Collection<LocalDelivery>;
  safari: Collection<SafariEntry>;
  routes: Collection<RouteRecord>;
  workTickets: Collection<WorkTicket>;
  consolidatedInvoices: Collection<ConsolidatedInvoice>;
  notifications: Collection<WorkflowNotification>;
  expenses: Collection<Expense>;
  billingProfile: BillingProfile;

  constructor(seed: FleetData) {
    this.schedules = new Collection(seed.schedules);
    this.vehicles = new Collection(seed.vehicles);
    this.invoices = new Collection(seed.invoices);
    this.rates = new Collection(seed.rates);
    this.localDeliveries = new Collection(seed.localDeliveries);
    this.safari = new Collection(seed.safari);
    this.routes = new Collection(seed.routes);
    this.workTickets = new Collection(seed.workTickets);
    this.consolidatedInvoices = new Collection(seed.consolidatedInvoices ?? []);
    this.notifications = new Collection(seed.notifications);
    this.expenses = new Collection(seed.expenses ?? []);
    this.billingProfile = structuredClone(seed.billingProfile ?? DEFAULT_BILLING_PROFILE);
  }

  snapshot(): FleetData {
    return {
      schedules: this.schedules.all(),
      vehicles: this.vehicles.all(),
      invoices: this.invoices.all(),
      rates: this.rates.all(),
      localDeliveries: this.localDeliveries.all(),
      safari: this.safari.all(),
      routes: this.routes.all(),
      workTickets: this.workTickets.all(),
      consolidatedInvoices: this.consolidatedInvoices.all(),
      notifications: this.notifications.all(),
      expenses: this.expenses.all(),
      billingProfile: structuredClone(this.billingProfile),
    };
  }
}

const globalStore = globalThis as typeof globalThis & { __fleetStore?: FleetStore };

export function getStore(): FleetStore {
  if (!globalStore.__fleetStore) {
    const seed = buildSeedData();
    const saved = loadPersistedStore();
    const data = saved ?? seed;
    if (!saved?.workTickets?.length) data.workTickets = seed.workTickets;
    if (!saved?.consolidatedInvoices?.length) data.consolidatedInvoices = seed.consolidatedInvoices ?? [];
    if (!saved?.expenses?.length) data.expenses = seed.expenses ?? [];
    if (!saved?.billingProfile) data.billingProfile = seed.billingProfile ?? DEFAULT_BILLING_PROFILE;
    globalStore.__fleetStore = new FleetStore(data);
  }
  return globalStore.__fleetStore;
}

export function persistStore(): void {
  savePersistedStore(getStore().snapshot());
}

export type StoreCollection = keyof Pick<
  FleetStore,
  | "schedules"
  | "vehicles"
  | "invoices"
  | "rates"
  | "localDeliveries"
  | "safari"
  | "routes"
  | "workTickets"
  | "consolidatedInvoices"
  | "notifications"
  | "expenses"
>;

export function getCollection<K extends StoreCollection>(key: K): FleetStore[K] {
  return getStore()[key];
}

export function getBillingProfile(): BillingProfile {
  return structuredClone(getStore().billingProfile);
}

export function setBillingProfile(profile: BillingProfile): BillingProfile {
  getStore().billingProfile = structuredClone(profile);
  persistStore();
  return getBillingProfile();
}
