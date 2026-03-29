// ─── Demo mock data for Door Panel ───────────────────────────────────────────
// Used in demo mode so the UI always shows realistic, populated data.

export const MOCK_DANCERS = [
  { id: "d1",  stage_name: "Skyy",   profile_photo_url: null, live_status: "on_floor",       slot_label: "on_stage", slot_order: 0, active_session_elapsed: null },
  { id: "d2",  stage_name: "Lottie", profile_photo_url: null, live_status: "on_floor",       slot_label: "on_deck",  slot_order: 1, active_session_elapsed: null },
  { id: "d3",  stage_name: "Venus",  profile_photo_url: null, live_status: "on_floor",       slot_label: "on_stage", slot_order: 2, active_session_elapsed: null },
  { id: "d4",  stage_name: "Mars",   profile_photo_url: null, live_status: "on_floor",       slot_label: "queued",   slot_order: 3, active_session_elapsed: null },
  { id: "d5",  stage_name: "Baby",   profile_photo_url: null, live_status: "on_floor",       slot_label: null,       slot_order: 4, active_session_elapsed: null },
  { id: "d6",  stage_name: "Tara",   profile_photo_url: null, live_status: "on_floor",       slot_label: null,       slot_order: 5, active_session_elapsed: null },
  { id: "d7",  stage_name: "Joy",    profile_photo_url: null, live_status: "on_floor",       slot_label: null,       slot_order: 6, active_session_elapsed: null },
  { id: "d8",  stage_name: "Dream",  profile_photo_url: null, live_status: "active_in_room", slot_label: null,       slot_order: 7, active_session_elapsed: 7 * 60 * 1000 },
  { id: "d9",  stage_name: "Luna",   profile_photo_url: null, live_status: "on_floor",       slot_label: null,       slot_order: 8, active_session_elapsed: null },
  { id: "d10", stage_name: "Cice",   profile_photo_url: null, live_status: "on_floor",       slot_label: null,       slot_order: 9, active_session_elapsed: null },
  { id: "d11", stage_name: "Bella",  profile_photo_url: null, live_status: "on_floor",       slot_label: null,       slot_order: 10, active_session_elapsed: null },
  { id: "d12", stage_name: "Ari",    profile_photo_url: null, live_status: "active_in_room", slot_label: null,       slot_order: 11, active_session_elapsed: 14 * 60 * 1000 },
  { id: "d13", stage_name: "Aria",   profile_photo_url: null, live_status: "on_floor",       slot_label: null,       slot_order: 12, active_session_elapsed: null },
  { id: "d14", stage_name: "Ice",    profile_photo_url: null, live_status: "on_floor",       slot_label: null,       slot_order: 13, active_session_elapsed: null },
];

export const MOCK_TIER_BREAKDOWN = [
  { tier: "full_cover",  label: "Full Cover ($10)",    count: 36, revenue: 360 },
  { tier: "reduced",     label: "Reduced ($5)",         count: 6,  revenue: 30  },
  { tier: "vip",         label: "VIP (Free)",           count: 4,  revenue: 0   },
  { tier: "ccc_card",    label: "CCC Card (Free)",      count: 2,  revenue: 0   },
  { tier: "two_for_one", label: "2-for-1 ($10 / 2)",   count: 6,  revenue: 36  },
];

export const MOCK_TOTAL_REVENUE = 426;
export const MOCK_TOTAL_GUESTS  = 54;

export const MOCK_SESSION_EARNINGS: Record<string, { gross: number; house: number; dancer: number }> = {
  d8:  { gross: 140, house: 84, dancer: 56 },
  d12: { gross: 200, house: 120, dancer: 80 },
};

export const MOCK_DISTRIBUTORS = [
  { id: "dist1", name: "City Promo Group",       commission_rate: 10 },
  { id: "dist2", name: "Downtown Hospitality",   commission_rate: 8  },
  { id: "dist3", name: "VIP Card Co.",            commission_rate: 12 },
];

// ─── Dancer Report mock data ──────────────────────────────────────────────────
// Matches exactly the wireframe examples (Skyy, Lottie, Mars A, Mars B shown as one row)

export const MOCK_DANCER_REPORT = [
  {
    dancerId:  "d1",
    stageName: "Skyy",
    checkIn:   "7:12 PM",
    isLate:    false,
    houseFee:  30,
    musicFee:  20,
    lateFee:   0,
    earnings:  0,
    carry:     0,
    net:       -50,   // owes $50
  },
  {
    dancerId:  "d2",
    stageName: "Lottie",
    checkIn:   "7:30 PM",
    isLate:    false,
    houseFee:  30,
    musicFee:  20,
    lateFee:   0,
    earnings:  330,
    carry:     0,
    net:       280,   // pay $280
  },
  {
    dancerId:  "d4",
    stageName: "Mars",
    checkIn:   "8:30 PM",
    isLate:    true,
    houseFee:  50,
    musicFee:  20,
    lateFee:   10,
    earnings:  265,
    carry:     0,
    net:       185,   // pay $185
  },
  {
    dancerId:  "d3",
    stageName: "Venus",
    checkIn:   "8:00 PM",
    isLate:    false,
    houseFee:  30,
    musicFee:  20,
    lateFee:   0,
    earnings:  180,
    carry:     0,
    net:       130,
  },
  {
    dancerId:  "d8",
    stageName: "Dream",
    checkIn:   "9:15 PM",
    isLate:    false,
    houseFee:  30,
    musicFee:  20,
    lateFee:   0,
    earnings:  140,
    carry:     0,
    net:       90,
  },
  {
    dancerId:  "d12",
    stageName: "Ari",
    checkIn:   "9:30 PM",
    isLate:    false,
    houseFee:  30,
    musicFee:  20,
    lateFee:   0,
    earnings:  200,
    carry:     0,
    net:       150,
  },
  {
    dancerId:  "d5",
    stageName: "Baby",
    checkIn:   "8:45 PM",
    isLate:    false,
    houseFee:  30,
    musicFee:  20,
    lateFee:   0,
    earnings:  90,
    carry:     0,
    net:       40,
  },
  {
    dancerId:  "d9",
    stageName: "Luna",
    checkIn:   "10:00 PM",
    isLate:    true,
    houseFee:  50,
    musicFee:  20,
    lateFee:   10,
    earnings:  60,
    carry:     0,
    net:       -20,   // owes $20
  },
];

// ─── Door Report mock detail rows ─────────────────────────────────────────────

export const MOCK_DOOR_DETAIL = [
  { time: "8:02 PM",  tier: "full_cover",  partySize: 1, revenue: 10, distributor: null },
  { time: "8:07 PM",  tier: "full_cover",  partySize: 1, revenue: 10, distributor: null },
  { time: "8:15 PM",  tier: "vip",         partySize: 1, revenue: 0,  distributor: null },
  { time: "8:22 PM",  tier: "two_for_one", partySize: 2, revenue: 10, distributor: "City Promo Group" },
  { time: "8:31 PM",  tier: "full_cover",  partySize: 1, revenue: 10, distributor: null },
  { time: "8:45 PM",  tier: "reduced",     partySize: 1, revenue: 5,  distributor: null },
  { time: "9:01 PM",  tier: "ccc_card",    partySize: 1, revenue: 0,  distributor: null },
  { time: "9:12 PM",  tier: "full_cover",  partySize: 1, revenue: 10, distributor: null },
  { time: "9:20 PM",  tier: "two_for_one", partySize: 2, revenue: 10, distributor: "Downtown Hospitality" },
  { time: "9:34 PM",  tier: "full_cover",  partySize: 1, revenue: 10, distributor: null },
  { time: "9:48 PM",  tier: "vip",         partySize: 1, revenue: 0,  distributor: null },
  { time: "10:02 PM", tier: "full_cover",  partySize: 1, revenue: 10, distributor: null },
  { time: "10:15 PM", tier: "reduced",     partySize: 1, revenue: 5,  distributor: null },
  { time: "10:29 PM", tier: "two_for_one", partySize: 2, revenue: 10, distributor: "VIP Card Co." },
  { time: "10:44 PM", tier: "full_cover",  partySize: 1, revenue: 10, distributor: null },
  { time: "11:00 PM", tier: "ccc_card",    partySize: 1, revenue: 0,  distributor: null },
  { time: "11:13 PM", tier: "full_cover",  partySize: 1, revenue: 10, distributor: null },
  { time: "11:22 PM", tier: "vip",         partySize: 1, revenue: 0,  distributor: null },
  { time: "11:30 PM", tier: "full_cover",  partySize: 1, revenue: 10, distributor: null },
  { time: "11:41 PM", tier: "reduced",     partySize: 1, revenue: 5,  distributor: null },
];

// ─── Full Report mock financials ──────────────────────────────────────────────

export const MOCK_FULL_REPORT = {
  doorRevenue:      426,
  roomRevenue:      2250,
  houseNet:         2340,
  dancerPayouts:    586,
  totalGuests:      54,
  returningPct:     38,
  roomSessionCount: 18,
  activeDancerCount: 14,
  commissions: [
    { name: "City Promo Group",     rate: 10, cards: 1, owed: 10  },
    { name: "Downtown Hospitality", rate: 8,  cards: 1, owed: 8   },
    { name: "VIP Card Co.",         rate: 12, cards: 1, owed: 12  },
  ],
};
