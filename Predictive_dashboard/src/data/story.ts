import type { Disease, Pt, RiskBand } from "./twin";

export interface Alert {
  id: string; day: number; band: RiskBand; title: string; titleHi: string;
  wardId?: string; target: Pt; evidence: string[]; review?: boolean;
}

const common: Alert[] = [
  { id: "a-rain", day: 6, band: "watch", title: "Heavy rainfall (118 mm) – standing-water risk rising", titleHi: "भारी वर्षा (118 मिमी) – जमा पानी का जोखिम बढ़ रहा है",
    wardId: "odai", target: [520, 330], evidence: ["IMD block rainfall 118 mm in 24h", "3 low-lying hamlets flagged by terrain model", "ASHA photos: water in tyres & pots in Odai Nagar"] },
  { id: "a-well", day: 11, band: "elevated", title: "Open well at Keezhur failed chlorine test", titleHi: "कीऴूर के खुले कुएँ में क्लोरीन परीक्षण विफल",
    wardId: "keezhur", target: [585, 195], evidence: ["Residual chlorine 0.05 ppm (target ≥ 0.2)", "Turbidity 8 NTU", "41 households depend on this source"] },
  { id: "a-asha", day: 12, band: "watch", title: "ASHA visit coverage dropped in Pudhu Colony", titleHi: "पुदु कॉलोनी में आशा भ्रमण कवरेज घटा",
    wardId: "pudhu", target: [720, 400], evidence: ["7 of 10 clusters not visited in 7+ days", "Weak signal: 14 visit records queued offline"] },
];

const byDisease: Record<Disease, Alert[]> = {
  lepto: [{ id: "a-lepto", day: 14, band: "critical", review: true, title: "Post-flood fever cluster candidate", titleHi: "बाढ़ के बाद बुखार क्लस्टर", target: [520, 300], evidence: ["Simulated post-flood exposure"] }],
  dengue: [
    { id: "a-fever", day: 9, band: "watch", title: "Fever syndromic tags +3.1σ above baseline in Odai Nagar", titleHi: "ओडै नगर में बुखार के संकेत आधार रेखा से +3.1σ ऊपर",
      wardId: "odai", target: [480, 345], evidence: ["11 fever tags in 72h vs baseline 3.4", "Age mix: 6 adults, 5 children", "No travel history in 9 of 11"] },
    { id: "a-cluster", day: 14, band: "critical", review: true, title: "Cluster candidate: 9 febrile cases in 72h across Odai Nagar + Pudhu Colony", titleHi: "क्लस्टर संभावित: ओडै नगर + पुदु कॉलोनी में 72 घंटे में 9 बुखार केस",
      wardId: "odai", target: [590, 375], evidence: ["Spatial scan p < 0.05 (simulated)", "4 cases with rash + retro-orbital pain", "2 breeding hotspots within 200 m"] },
    { id: "a-kits", day: 14, band: "elevated", title: "PHC platelet-test-kit stock: 3 days left at predicted demand", titleHi: "PHC प्लेटलेट टेस्ट किट: अनुमानित मांग पर 3 दिन का स्टॉक",
      target: [380, 535], evidence: ["60 kits on hand", "Predicted 18–24 tests/day from day 16"] },
  ],
  diarrhoeal: [
    { id: "a-fever", day: 10, band: "watch", title: "Loose-stool tags +2.6σ above baseline in Keezhur", titleHi: "कीऴूर में दस्त के संकेत +2.6σ ऊपर", wardId: "keezhur", target: [560, 150], evidence: ["8 diarrhoea tags in 72h", "5 households share Keezhur well"] },
    { id: "a-cluster", day: 14, band: "critical", review: true, title: "Cluster candidate: 7 diarrhoeal cases downstream of Keezhur well", titleHi: "क्लस्टर संभावित: कीऴूर कुएँ के नीचे 7 दस्त केस", wardId: "keezhur", target: [560, 220], evidence: ["Cases follow drainage line", "2 children under 5 with dehydration"] },
    { id: "a-kits", day: 14, band: "elevated", title: "PHC ORS stock: 4 days left at predicted demand", titleHi: "PHC ORS स्टॉक: 4 दिन शेष", target: [380, 535], evidence: ["220 sachets on hand"] },
  ],
  ili: [
    { id: "a-fever", day: 10, band: "watch", title: "Cough + fever tags rising among school children (Melur)", titleHi: "मेलूर में स्कूली बच्चों में खाँसी + बुखार बढ़ रहा है", wardId: "melur", target: [365, 250], evidence: ["School absenteeism 18% (baseline 6%)", "Cold spell: night temp 13°C"] },
    { id: "a-cluster", day: 14, band: "critical", review: true, title: "Cluster candidate: ILI spreading school → Anganwadi → Kovil Street", titleHi: "क्लस्टर संभावित: स्कूल → आंगनवाड़ी → कोविल स्ट्रीट में ILI", wardId: "melur", target: [330, 320], evidence: ["Household links to school in 12 of 15 cases"] },
    { id: "a-kits", day: 14, band: "elevated", title: "PHC pulse-oximeter probes & antipyretics: 5 days left", titleHi: "PHC दवा स्टॉक: 5 दिन शेष", target: [380, 535], evidence: ["Paracetamol 400 strips"] },
  ],
  malaria: [
    { id: "a-fever", day: 11, band: "watch", title: "Fever with chills rising at the forest edge (Malai Adivaram)", titleHi: "वन किनारे (मलै अडिवारम) में ठंड के साथ बुखार बढ़ रहा है", wardId: "malai", target: [815, 175], evidence: ["5 RDT-positive in 5 days", "Night-time exposure: forest produce collection"] },
    { id: "a-cluster", day: 14, band: "critical", review: true, title: "Cluster candidate: P. vivax cases along Malai ridge (dead-zone)", titleHi: "क्लस्टर संभावित: मलै रिज पर P. vivax केस", wardId: "malai", target: [830, 190], evidence: ["Reports arrived via LoRa relay", "No bed-net distribution in 14 months"] },
    { id: "a-kits", day: 14, band: "elevated", title: "Sub-centre antimalarial (ACT) stock: 4 days left", titleHi: "उप-केंद्र मलेरिया-रोधी दवा: 4 दिन शेष", target: [650, 300], evidence: ["24 courses on hand"] },
  ],
};

export const alertsFor = (d: Disease) => [...common, ...byDisease[d]].sort((a, b) => a.day - b.day);

export interface Driver { id: string; label: string; labelHi: string; contribution: number; related: string[]; target: Pt; k?: number }
export const DRIVERS: Record<Disease, Driver[]> = {
  lepto: [{ id: "flood", label: "Post-flood water exposure", labelHi: "बाढ़ के बाद पानी का संपर्क", contribution: 38, related: ["pond"], target: [520, 300] }],
  dengue: [
    { id: "rain", label: "Rainfall last 7 days", labelHi: "पिछले 7 दिनों की वर्षा", contribution: 32, related: ["bh1", "bh2", "bh3", "bh4", "bh5"], target: [500, 360], k: 1.3 },
    { id: "water", label: "Standing water near Odai Nagar", labelHi: "ओडै नगर के पास जमा पानी", contribution: 24, related: ["bh1", "bh2", "pond"], target: [480, 350], k: 2 },
    { id: "fever", label: "Fever syndromic tags above baseline", labelHi: "आधार रेखा से ऊपर बुखार संकेत", contribution: 19, related: ["odai", "pudhu"], target: [600, 370], k: 1.6 },
    { id: "asha", label: "Stale ASHA visits (Pudhu Colony)", labelHi: "पुराने आशा भ्रमण (पुदु कॉलोनी)", contribution: 14, related: ["pudhu", "asha1"], target: [720, 400], k: 2 },
    { id: "aw", label: "Anganwadi attendance drop", labelHi: "आंगनवाड़ी उपस्थिति में गिरावट", contribution: 8, related: ["aw1", "aw2"], target: [420, 400], k: 1.6 },
  ],
  diarrhoeal: [
    { id: "well", label: "Keezhur well failed chlorine test", labelHi: "कीऴूर कुआँ क्लोरीन परीक्षण विफल", contribution: 34, related: ["well1"], target: [585, 195], k: 2.2 },
    { id: "flood", label: "Post-rain runoff into pond", labelHi: "तालाब में वर्षा का बहाव", contribution: 26, related: ["pond", "tank"], target: [560, 330], k: 1.6 },
    { id: "fever", label: "Loose-stool tags above baseline", labelHi: "दस्त संकेत आधार रेखा से ऊपर", contribution: 18, related: ["keezhur", "odai"], target: [530, 250], k: 1.5 },
    { id: "asha", label: "Stale ASHA visits (Pudhu Colony)", labelHi: "पुराने आशा भ्रमण", contribution: 12, related: ["pudhu"], target: [720, 400], k: 2 },
    { id: "aw", label: "Under-5 share in affected wards", labelHi: "प्रभावित वार्डों में 5 वर्ष से कम", contribution: 10, related: ["aw1"], target: [520, 405], k: 2 },
  ],
  ili: [
    { id: "school", label: "School crowding & absenteeism", labelHi: "स्कूल में भीड़ व अनुपस्थिति", contribution: 33, related: ["school"], target: [365, 250], k: 2.2 },
    { id: "cold", label: "Cold spell (night temp 13°C)", labelHi: "शीत लहर (रात 13°C)", contribution: 22, related: ["melur", "keezhur"], target: [430, 170], k: 1.4 },
    { id: "aw", label: "Anganwadi contact network", labelHi: "आंगनवाड़ी संपर्क नेटवर्क", contribution: 18, related: ["aw1", "aw2"], target: [400, 395], k: 1.6 },
    { id: "fever", label: "Cough + fever tags above baseline", labelHi: "खाँसी + बुखार संकेत", contribution: 16, related: ["melur", "kovil"], target: [280, 300], k: 1.5 },
    { id: "market", label: "Weekly market gathering", labelHi: "साप्ताहिक बाज़ार", contribution: 11, related: ["market"], target: [430, 470], k: 2 },
  ],
  malaria: [
    { id: "forest", label: "Forest-edge night exposure", labelHi: "वन किनारे रात्रि संपर्क", contribution: 31, related: ["malai"], target: [830, 160], k: 1.8 },
    { id: "water", label: "Stagnant water after rain", labelHi: "वर्षा के बाद रुका पानी", contribution: 25, related: ["bh3", "bh4"], target: [720, 400], k: 1.8 },
    { id: "dead", label: "Connectivity dead-zone delays reports", labelHi: "नेटवर्क डेड-ज़ोन से रिपोर्ट में देरी", contribution: 18, related: ["malai", "asha1"], target: [850, 180], k: 1.6 },
    { id: "fever", label: "Fever with chills above baseline", labelHi: "ठंड के साथ बुखार", contribution: 15, related: ["malai", "pudhu"], target: [780, 280], k: 1.4 },
    { id: "nets", label: "No bed-net distribution in 14 months", labelHi: "14 महीनों से मच्छरदानी वितरण नहीं", contribution: 11, related: ["malai"], target: [815, 175], k: 2 },
  ],
};

export const SCENES = [
  { key: 1, day: 3, applied: false, en: "Calm baseline – 2 to 4 fever cases a day", hi: "शांत आधार रेखा" },
  { key: 2, day: 6, applied: false, en: "Rain event – 118 mm, standing water in Odai Nagar & Pudhu Colony", hi: "वर्षा घटना" },
  { key: 3, day: 10, applied: false, en: "Signal builds – fever tags climb, mosquito index rises", hi: "संकेत बढ़ रहे हैं" },
  { key: 4, day: 14, applied: false, en: "NOW – cluster candidate, recommend district review", hi: "अभी – क्लस्टर संभावित, ज़िला समीक्षा की सिफ़ारिश" },
  { key: 5, day: 20, applied: false, en: "Do nothing – forecast peak, beds exceed capacity", hi: "कुछ न करें – पूर्वानुमान शिखर" },
  { key: 6, day: 20, applied: true, en: "With interventions – peak halves, beds stay under capacity", hi: "हस्तक्षेप के साथ – शिखर आधा" },
];
