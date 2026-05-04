export interface AppData {
  trips: Trip[];
  lugTpls: string[];
}

export type CollabRole = 'owner' | 'editor' | 'viewer';

export interface CollabMember {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: CollabRole;
  joinedAt: string;
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  currency: string;
  localCurrency: string;
  memo: string;
  itinerary: Record<string, ItineraryItem[]>;
  attractions: Attraction[];
  accommodations: Accommodation[];
  transports: Transport[];
  expenses: Expense[];
  luggage: LuggageItem[];
  dayOrder?: Record<string, string[]>;
  collabId?: string;
  ownerId?: string;
  members?: Record<string, CollabMember>;
  invitedEmails?: string[];
  savedFromCollabId?: string;
  shareId?: string;
}

export interface ItineraryItem {
  id: string;
  time: string;
  name: string;
  note: string;
  attrId?: string;
  overrideHours?: string;
  overridePrice?: string | number;
  overrideWebsite?: string;
  overrideMapsUrl?: string;
}

export interface Attraction {
  id: string;
  name: string;
  hours: string;
  price: string | number;
  mapsUrl: string;
  website: string;
  note: string;
  visited?: boolean;
  queryOk?: boolean | null;
  manualPrice?: boolean;
  source?: string;
  ticketReminder?: TicketReminder | null;
}

export interface TicketReminder {
  date: string;
  time: string;
  tz: string;
}

export interface Accommodation {
  id: string;
  name: string;
  platform: string;
  checkIn: string;
  checkInTime: string;
  checkOut: string;
  checkOutTime: string;
  freeCancel: string;
  amount: string | number;
  currency: string;
  orderId: string;
  note: string;
}

export interface Transport {
  id: string;
  type: string;
  from: string;
  to: string;
  date: string;
  depTime: string;
  arrTime: string;
  freeCancel: string;
  amount: string | number;
  currency: string;
  orderId: string;
  note: string;
}

export interface Expense {
  id: string;
  amount: string | number;
  currency: string;
  category: string;
  date: string;
  note: string;
  imageData?: string;
  files?: ExpenseFile[];
  autoFrom?: string;
}

export interface ExpenseFile {
  name: string;
}

export interface LuggageItem {
  id: string;
  name: string;
  checked: boolean;
}

export interface Reminder {
  type: 'ticket' | 'cancel';
  tripName: string;
  label: string;
  date: string;
  time?: string;
  tz?: string;
  diff: number;
  tripId: string;
}
