export interface HistoryPoint { date: string; median: number; min?: number; max?: number }
export interface IPO {
  id: string; name: string; segment?: string; status?: string;
  priceMin?: number; priceMax?: number; lotSize?: number; minInvestment?: number; minLots?: number;
  gmp?: number; gmpPercent?: number; gmpMin?: number; gmpMax?: number; sourceCount?: number; confidence?: string;
  openDate?: string; closeDate?: string; allotmentDate?: string; listingDate?: string; upiCutoff?: string;
  subscription?: { qib?: number; nii?: number; retail?: number; total?: number };
  overallSubscription?: number; subscriptionSource?: string;
  registrar?: { name?: string; url?: string };
  trackers?: { name: string; gmp: number; url?: string }[]; history?: HistoryPoint[];
}
export interface MarketData { schemaVersion: 1; generatedAt: string; contentHash: string; ipos: IPO[] }
export interface FamilyMember { id: string; name: string; pan: string; enabled: boolean; createdAt: string }
export interface ApplicationRecord { applied: boolean; appliedAt?: string; lots?: number }
export interface LocalState { version: 1; members: FamilyMember[]; applications: Record<string, Record<string, ApplicationRecord>> }
