export const SERVICES = [
  { id: 'elec',   ico: '⚡', lbl: 'Electrician',  range: '₹300–₹800',  min: 300, top: 800  },
  { id: 'plumb',  ico: '🔧', lbl: 'Plumber',       range: '₹250–₹700',  min: 250, top: 700  },
  { id: 'clean',  ico: '🧹', lbl: 'Cleaner',       range: '₹500–₹1500', min: 500, top: 1500 },
  { id: 'carpen', ico: '🪚', lbl: 'Carpenter',     range: '₹400–₹1000', min: 400, top: 1000 },
  { id: 'paint',  ico: '🎨', lbl: 'Painter',       range: '₹800–₹3000', min: 800, top: 3000 },
  { id: 'pest',   ico: '🐛', lbl: 'Pest Control',  range: '₹600–₹2000', min: 600, top: 2000 },
  { id: 'mech',   ico: '🔩', lbl: 'Mechanic',      range: '₹400–₹1200', min: 400, top: 1200 },
  { id: 'labor',  ico: '👷', lbl: 'Labourer',      range: '₹300–₹600',  min: 300, top: 600  },
  { id: 'emerg',  ico: '🚨', lbl: 'Emergency',     range: '₹500–₹2000', min: 500, top: 2000 },
]
export const serviceFloor = id => SERVICES.find(s => s.id === id)?.min ?? 300
export const KA_CITIES = [
  'Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi',
  'Belagavi', 'Tumakuru', 'Shivamogga', 'Davangere',
  'Kalaburagi', 'Udupi', 'Hassan', 'Mandya',
  'Dharwad', 'Vijayapura', 'Bidar',
]

