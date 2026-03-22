// Shared mock data for all dashboard sub-pages
// Icon keys reference Lucide icon names for rendering

export const periodData = {
  today: {
    kpis: [
      { label: "Door Revenue", value: 1840, prefix: "$", icon: "door", trend: 12 },
      { label: "Room Revenue", value: 2250, prefix: "$", icon: "sofa", trend: 8 },
      { label: "House Net", value: 3478, prefix: "$", icon: "home", trend: 15 },
      { label: "Payouts Owed", value: 612, prefix: "$", icon: "wallet", trend: -4 },
    ],
    ops: [
      { label: "Total Guests", value: 94, icon: "users" },
      { label: "Active Dancers", value: 8, icon: "user", suffix: "" },
      { label: "Room Sessions", value: 18, icon: "music" },
      { label: "Avg Session", value: 12, icon: "timer", suffix: " min" },
      { label: "Returning Guests", value: 34, icon: "repeat", suffix: "%" },
    ],
    chart: [
      { period: "8PM", door: 180, room: 140 },
      { period: "9PM", door: 260, room: 320 },
      { period: "10PM", door: 340, room: 610 },
      { period: "11PM", door: 420, room: 700 },
      { period: "12AM", door: 320, room: 280 },
      { period: "1AM", door: 200, room: 140 },
      { period: "2AM", door: 80, room: 50 },
      { period: "3AM", door: 40, room: 10 },
    ],
    split: [
      { period: "8PM", house: 224, dancer: 96 },
      { period: "9PM", house: 406, dancer: 174 },
      { period: "10PM", house: 665, dancer: 285 },
      { period: "11PM", house: 784, dancer: 336 },
      { period: "12AM", house: 420, dancer: 180 },
      { period: "1AM", house: 238, dancer: 102 },
      { period: "2AM", house: 91, dancer: 39 },
      { period: "3AM", house: 35, dancer: 15 },
    ],
    dancers: [
      { name: "Angel #9", checkIn: "8:00 PM", checkOut: "12:30 AM", sessions: 6, gross: 900, houseCut: 630, houseFee: 50, netPayout: 220, active: false },
      { name: "Jade #4", checkIn: "9:12 PM", checkOut: null, sessions: 5, gross: 750, houseCut: 525, houseFee: 50, netPayout: 175, active: true },
      { name: "Sky #7", checkIn: "10:01 PM", checkOut: null, sessions: 4, gross: 600, houseCut: 420, houseFee: 50, netPayout: 130, active: true },
      { name: "Storm #6", checkIn: "9:55 PM", checkOut: null, sessions: 4, gross: 550, houseCut: 385, houseFee: 50, netPayout: 115, active: true },
      { name: "Nova #2", checkIn: "8:45 PM", checkOut: null, sessions: 3, gross: 450, houseCut: 315, houseFee: 50, netPayout: 85, active: true },
      { name: "Luna #1", checkIn: "9:30 PM", checkOut: "1:15 AM", sessions: 2, gross: 300, houseCut: 210, houseFee: 50, netPayout: 40, active: false },
      { name: "Raven #3", checkIn: "10:45 PM", checkOut: null, sessions: 2, gross: 300, houseCut: 210, houseFee: 50, netPayout: 40, active: true },
      { name: "Blaze #11", checkIn: "11:00 PM", checkOut: null, sessions: 1, gross: 150, houseCut: 105, houseFee: 50, netPayout: -5, active: true },
    ],
  },
  week: {
    kpis: [
      { label: "Door Revenue", value: 11200, prefix: "$", icon: "door", trend: 10 },
      { label: "Room Revenue", value: 15750, prefix: "$", icon: "sofa", trend: 14 },
      { label: "House Net", value: 24346, prefix: "$", icon: "home", trend: 12 },
      { label: "Payouts Owed", value: 4284, prefix: "$", icon: "wallet", trend: -2 },
    ],
    ops: [
      { label: "Total Guests", value: 658, icon: "users" },
      { label: "Active Dancers", value: 7, icon: "user", suffix: "/night avg" },
      { label: "Room Sessions", value: 126, icon: "music" },
      { label: "Avg Session", value: 11, icon: "timer", suffix: " min" },
      { label: "Returning Guests", value: 37, icon: "repeat", suffix: "%" },
    ],
    chart: [
      { period: "Mon", door: 1200, room: 1800 },
      { period: "Tue", door: 1000, room: 1500 },
      { period: "Wed", door: 1100, room: 1700 },
      { period: "Thu", door: 1400, room: 2200 },
      { period: "Fri", door: 2200, room: 3400 },
      { period: "Sat", door: 2600, room: 3800 },
      { period: "Sun", door: 1700, room: 1350 },
    ],
    split: [
      { period: "Mon", house: 2100, dancer: 900 },
      { period: "Tue", house: 1750, dancer: 750 },
      { period: "Wed", house: 1960, dancer: 840 },
      { period: "Thu", house: 2520, dancer: 1080 },
      { period: "Fri", house: 3920, dancer: 1680 },
      { period: "Sat", house: 4480, dancer: 1920 },
      { period: "Sun", house: 2135, dancer: 915 },
    ],
    dancers: null,
  },
  month: {
    kpis: [
      { label: "Door Revenue", value: 44800, prefix: "$", icon: "door", trend: 18 },
      { label: "Room Revenue", value: 63000, prefix: "$", icon: "sofa", trend: 22 },
      { label: "House Net", value: 97384, prefix: "$", icon: "home", trend: 20 },
      { label: "Payouts Owed", value: 17136, prefix: "$", icon: "wallet", trend: -6 },
    ],
    ops: [
      { label: "Total Guests", value: 2632, icon: "users" },
      { label: "Active Dancers", value: 7, icon: "user", suffix: "/night avg" },
      { label: "Room Sessions", value: 504, icon: "music" },
      { label: "Avg Session", value: 12, icon: "timer", suffix: " min" },
      { label: "Returning Guests", value: 39, icon: "repeat", suffix: "%" },
    ],
    chart: [
      { period: "Week 1", door: 10000, room: 14000 },
      { period: "Week 2", door: 11200, room: 16000 },
      { period: "Week 3", door: 12000, room: 17500 },
      { period: "Week 4", door: 11600, room: 15500 },
    ],
    split: [
      { period: "Week 1", house: 16800, dancer: 7200 },
      { period: "Week 2", house: 19040, dancer: 8160 },
      { period: "Week 3", house: 20650, dancer: 8850 },
      { period: "Week 4", house: 18970, dancer: 8130 },
    ],
    dancers: null,
  },
  year: {
    kpis: [
      { label: "Door Revenue", value: 537600, prefix: "$", icon: "door", trend: 25 },
      { label: "Room Revenue", value: 756000, prefix: "$", icon: "sofa", trend: 30 },
      { label: "House Net", value: 1168608, prefix: "$", icon: "home", trend: 28 },
      { label: "Payouts Owed", value: 205632, prefix: "$", icon: "wallet", trend: -3 },
    ],
    ops: [
      { label: "Total Guests", value: 31584, icon: "users" },
      { label: "Active Dancers", value: 7, icon: "user", suffix: "/night avg" },
      { label: "Room Sessions", value: 6048, icon: "music" },
      { label: "Avg Session", value: 11.5, icon: "timer", suffix: " min" },
      { label: "Returning Guests", value: 41, icon: "repeat", suffix: "%" },
    ],
    chart: [
      { period: "Jan", door: 40000, room: 58000 },
      { period: "Feb", door: 38000, room: 55000 },
      { period: "Mar", door: 44800, room: 63000 },
      { period: "Apr", door: 42000, room: 60000 },
      { period: "May", door: 46000, room: 66000 },
      { period: "Jun", door: 48000, room: 70000 },
      { period: "Jul", door: 50000, room: 72000 },
      { period: "Aug", door: 47000, room: 68000 },
      { period: "Sep", door: 45000, room: 64000 },
      { period: "Oct", door: 49000, room: 71000 },
      { period: "Nov", door: 44000, room: 62000 },
      { period: "Dec", door: 44800, room: 67000 },
    ],
    split: [
      { period: "Jan", house: 68600, dancer: 29400 },
      { period: "Feb", house: 65100, dancer: 27900 },
      { period: "Mar", house: 75460, dancer: 32340 },
      { period: "Apr", house: 71400, dancer: 30600 },
      { period: "May", house: 78400, dancer: 33600 },
      { period: "Jun", house: 82600, dancer: 35400 },
      { period: "Jul", house: 85400, dancer: 36600 },
      { period: "Aug", house: 80500, dancer: 34500 },
      { period: "Sep", house: 76300, dancer: 32700 },
      { period: "Oct", house: 84000, dancer: 36000 },
      { period: "Nov", house: 74200, dancer: 31800 },
      { period: "Dec", house: 78260, dancer: 33540 },
    ],
    dancers: null,
  },
};

export const periods = ["Today", "This Week", "This Month", "This Year", "Custom"] as const;
export type Period = typeof periods[number];
export const periodKeys: Record<Period, keyof typeof periodData> = {
  "Today": "today",
  "This Week": "week",
  "This Month": "month",
  "This Year": "year",
  "Custom": "today",
};

export const topPerformers = [
  { rank: 1, name: "Angel #9", sessions: 6, gross: 900, payout: 220 },
  { rank: 2, name: "Jade #4", sessions: 5, gross: 750, payout: 175 },
  { rank: 3, name: "Sky #7", sessions: 4, gross: 600, payout: 130 },
];

export function generateHeatmap() {
  const days: (null | { day: number; revenue: number; guests: number; dancers: number; isToday: boolean; isPast: boolean })[] = [];
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();

  for (let i = 0; i < firstDow; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dow = date.getDay();
    const isWeekend = dow === 5 || dow === 6;
    const isPast = d <= now.getDate();
    const revenue = isPast ? (isWeekend ? 4000 + Math.random() * 4000 : 1500 + Math.random() * 3000) : 0;
    const guests = isPast ? Math.round(revenue / 38) : 0;
    const dancers = isPast ? Math.floor(5 + Math.random() * 5) : 0;
    days.push({ day: d, revenue: Math.round(revenue), guests, dancers, isToday: d === now.getDate(), isPast });
  }
  return days;
}

export const revenueStreams = [
  { stream: "Door Entry", transactions: 94, gross: 1880, housePct: 100, houseEarned: 1880, dancerPct: 0, dancerEarned: 0 },
  { stream: "1 Song ($50)", transactions: 8, gross: 400, housePct: 70, houseEarned: 280, dancerPct: 30, dancerEarned: 120 },
  { stream: "2 Songs ($100)", transactions: 5, gross: 500, housePct: 70, houseEarned: 350, dancerPct: 30, dancerEarned: 150 },
  { stream: "3 Songs ($150)", transactions: 9, gross: 1350, housePct: 70, houseEarned: 945, dancerPct: 30, dancerEarned: 405 },
];

export const hourlyRevenue = [
  { hour: "8PM", door: 180, oneSong: 50, multiSong: 90 },
  { hour: "9PM", door: 260, oneSong: 100, multiSong: 220 },
  { hour: "10PM", door: 340, oneSong: 150, multiSong: 460 },
  { hour: "11PM", door: 420, oneSong: 200, multiSong: 500 },
  { hour: "12AM", door: 320, oneSong: 100, multiSong: 180 },
  { hour: "1AM", door: 200, oneSong: 50, multiSong: 90 },
  { hour: "2AM", door: 80, oneSong: 0, multiSong: 50 },
  { hour: "3AM", door: 40, oneSong: 0, multiSong: 10 },
];

export const dayOverDay = [
  { day: "Mon", thisWeek: 3000, lastWeek: 2800 },
  { day: "Tue", thisWeek: 2500, lastWeek: 2600 },
  { day: "Wed", thisWeek: 2800, lastWeek: 2400 },
  { day: "Thu", thisWeek: 3600, lastWeek: 3200 },
  { day: "Fri", thisWeek: 5600, lastWeek: 5000 },
  { day: "Sat", thisWeek: 6400, lastWeek: 5800 },
  { day: "Sun", thisWeek: 3050, lastWeek: 3100 },
];

export const dancerSessions: Record<string, { time: string; songs: number; amount: number }[]> = {
  "Angel #9": [
    { time: "8:15 PM", songs: 3, amount: 150 },
    { time: "9:02 PM", songs: 2, amount: 100 },
    { time: "9:48 PM", songs: 3, amount: 150 },
    { time: "10:22 PM", songs: 1, amount: 50 },
    { time: "11:05 PM", songs: 3, amount: 150 },
    { time: "11:50 PM", songs: 3, amount: 150 },
  ],
  "Jade #4": [
    { time: "9:14 PM", songs: 3, amount: 150 },
    { time: "9:58 PM", songs: 2, amount: 100 },
    { time: "10:31 PM", songs: 1, amount: 50 },
    { time: "10:52 PM", songs: 3, amount: 150 },
    { time: "11:18 PM", songs: 2, amount: 100 },
  ],
  "Sky #7": [
    { time: "10:15 PM", songs: 2, amount: 100 },
    { time: "10:55 PM", songs: 3, amount: 150 },
    { time: "11:30 PM", songs: 2, amount: 100 },
    { time: "12:10 AM", songs: 3, amount: 150 },
  ],
  "Storm #6": [
    { time: "10:10 PM", songs: 3, amount: 150 },
    { time: "10:50 PM", songs: 2, amount: 100 },
    { time: "11:25 PM", songs: 3, amount: 150 },
    { time: "12:05 AM", songs: 1, amount: 50 },
  ],
  "Nova #2": [
    { time: "9:00 PM", songs: 3, amount: 150 },
    { time: "10:20 PM", songs: 2, amount: 100 },
    { time: "11:40 PM", songs: 2, amount: 100 },
  ],
  "Luna #1": [
    { time: "9:45 PM", songs: 3, amount: 150 },
    { time: "11:00 PM", songs: 2, amount: 100 },
  ],
  "Raven #3": [
    { time: "11:00 PM", songs: 2, amount: 100 },
    { time: "12:15 AM", songs: 2, amount: 100 },
  ],
  "Blaze #11": [
    { time: "11:20 PM", songs: 1, amount: 50 },
  ],
};

export const staffMembers = [
  { name: "Marcus", role: "Door Staff", active: true },
  { name: "Dre", role: "Door Staff", active: true },
  { name: "Keisha", role: "Door Staff", active: false },
  { name: "Tony", role: "Room Att.", active: true },
  { name: "Lia", role: "Room Att.", active: true },
];

export const pastReports = [
  { date: "Mar 3, 2026", type: "Shift Report", period: "Tonight", by: "Admin" },
  { date: "Mar 2, 2026", type: "Payroll Sheet", period: "Tonight", by: "Admin" },
  { date: "Feb 28, 2026", type: "Revenue Report", period: "This Week", by: "Admin" },
  { date: "Feb 22, 2026", type: "Revenue Report", period: "This Month", by: "Admin" },
];

