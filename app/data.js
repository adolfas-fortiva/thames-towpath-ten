'use client'

export const NAVY = '#1B2869'
export const CYAN = '#00B5E2'
export const YELLOW = '#FECB00'

export const ZONES = [
  {
    id: 1, name: 'Zone 1 — Field', lead: 'Duncan Grassie', leadPhone: '07752966637',
    marshals: [
      { id: 'M1', name: 'Joe Heale', phone: '07801488794', w3w: 'clouds.cliff.action', instructions: 'Direct runners safely from field onto path and warn pedestrians if needed.' },
      { id: 'M2', name: 'Phill Robinson', phone: '07967027563', w3w: 'paper.ladder.twist', instructions: 'Direct runners off footpath onto grass to loop along top perimeter. Second time, direct onto footpath to footbridge. On return, direct from footpath onto grass towards top perimeter.' },
      { id: 'M3', name: 'Jo Neville', phone: '07872055849', w3w: 'once.fairly.beast', instructions: 'Direct runners straight (north) towards the perimeter. Runners who have done ODP Parkrun will expect to turn left — do not let them.' },
      { id: 'M4', name: 'Gary Mellish + Dave Brooks + Tom Orton', phone: '07817653570', w3w: 'wink.wires.wipes', instructions: 'Direct runners along northern perimeter to the top NE corner of ODP.' },
      { id: 'M4.1', name: 'Ciaran', phone: '07764926307', w3w: 'snow.fairly.jumps', instructions: 'Corner marshal — direct runners south towards start/finish on outward leg. On return, direct around corner towards finish line.' },
      { id: 'M5', name: 'Helen Quinn', phone: '07779119018', w3w: 'props.react.indeed', instructions: 'Funnel runners safely across the narrow footbridge. Shouting SINGLE FILE is helpful.' },
      { id: 'M6', name: 'Edyta & Sarah Macintosh', phone: '07833388107 / 07517917967', w3w: 'amuse.wished.move', instructions: 'One each side of the footbridge. Direct single file then left onto towpath. Manage pedestrian crossings.' },
    ]
  },
  {
    id: 2, name: 'Zone 2 — Richmond', lead: 'Andy Bowen', leadPhone: '07713987025',
    marshals: [
      { id: 'M7', name: 'Dave Cobb', phone: '07801445838', w3w: 'island.prom.libraries', instructions: 'Direct runners clearly. Proactively manage pedestrian crossings. Prevent interference with runners.' },
      { id: 'M7.1', name: 'Andy Bowen + Nick Mander', phone: '07702200708', w3w: 'washed.tips.hype', instructions: 'Turning point — direct runners from Water Lane back towards the towpath.' },
      { id: 'M8', name: 'Rebecca Knight', phone: '07989449498', w3w: 'silent.gums.window', instructions: 'Monitor Richmond Bridge Boat Club. Manage interactions with boats or club equipment crossing the runner route.' },
      { id: 'M9', name: 'Naomi Thorogood', phone: '07814629357', w3w: 'memory.tennis.pages', instructions: 'Oversee Richmond Rowing Boat Hire area. Keep route free from interference.' },
      { id: 'M10', name: 'David Larkam', phone: '07485004400', w3w: 'error.gravel.point', instructions: 'Direct runners clearly and manage pedestrian crossing points along route.' },
      { id: 'M11', name: 'Kim Stephenson', phone: '07803157007', w3w: 'thus.paid.fuel', instructions: 'Direct runners. Manage pedestrian flow near restaurants. Keep route clear.' },
      { id: 'M12', name: 'Alan Armstrong', phone: '07561573035', w3w: 'hope.counts.forget', instructions: "Direct runners onto left fork towards Eileen's Cafe. Manage pedestrians. Turning point." },
      { id: 'M13', name: 'Shaun', phone: '07708556351', w3w: 'loaf.tube.trips', instructions: "Direct runners right towards the river (outward). On return, direct left past Eileen's Cafe. Turning point." },
    ]
  },
  {
    id: 3, name: 'Zone 3 — Ham', lead: 'Tom Newman & Peter Hall', leadPhone: '07792281808 / 07968398947',
    marshals: [
      { id: 'M14', name: 'Tom Newman + David Boot', phone: '07533359142', w3w: 'booth.modes.fast', instructions: 'Direct runners. Manage pedestrian crossings. Keep route clear. Manage vehicles if required.' },
      { id: 'M15', name: 'Jon Scott Francis', phone: '07748141637', w3w: 'sends.range.frost', instructions: "Direct runners. Manage pedestrian crossings near busier sections. Possible pedestrians from Hammerton's Ferry." },
      { id: 'M16', name: 'Peter Hall (water stn lead)', phone: '07968398947', w3w: 'jars.relay.heads', instructions: 'Manage water station. Control runner access. No pedestrian interference.' },
      { id: 'M17', name: 'Gary Robinson', phone: '07803601580', w3w: 'jars.relay.heads', instructions: 'Assist water station. Direct runners for safe efficient use.' },
      { id: 'M18', name: 'Michelle Grimley', phone: '07739312417', w3w: 'jars.relay.heads', instructions: 'Support water station. Clear runner access. No pedestrian interference.' },
      { id: 'M19', name: 'Catherine', phone: '07749901618', w3w: 'jars.relay.heads', instructions: 'Assist at water station. Keep area clear and efficient.' },
    ]
  },
  {
    id: 4, name: 'Zone 4 — Kingston', lead: 'Andy Orchard', leadPhone: '07747788876',
    marshals: [
      { id: 'M20', name: 'Susan Cargill', phone: '07823351392', w3w: 'like.villa.rested', instructions: 'Clearly direct runners. Proactively manage pedestrian crossing points.' },
      { id: 'M21', name: 'Matt Priest', phone: '07768031776', w3w: 'jazzy.deaf.swing', instructions: 'Ensure runners clearly directed. Safely manage pedestrian crossings.' },
      { id: 'M21.1', name: 'Sybille Schorm', phone: '07962925311', w3w: 'head.fears.tape', instructions: 'Direct runners onto upper footpath. Runners approach from lower (riverside) path on return loop.' },
      { id: 'M22', name: 'Ben Richmond', phone: '07910682463', w3w: 'drape.bars.spin', instructions: 'Direct runners safely. Can position on grass between upper and lower paths to cover both outward and return runners.' },
      { id: 'M23', name: 'Andy Orchard + Jodie', phone: '07747788876 / 07737221443', w3w: 'bonus.dream.cure', instructions: 'Manage the turning point. Safely direct runners and ensure smooth turnaround.' },
    ]
  }
]

export const FIELD_TEAMS = [
  { id: 'FT1', role: 'Signage — course & field', lead: 'Rich Berry', leadPhone: '07703439624', members: 'Geordie Clarke (07780541838), Will Meakin (07799595696), Gary Mellish (07817653570)', notes: 'Place and collect all route signage. Rich leads the pre-race walk.' },
  { id: 'FT2', role: 'Baggage Drop & Pick Up', lead: 'Florian K', leadPhone: '07789381091', members: 'Will Meakin, Noah Cohen (07872350898), Rose Lewis (07973600476), Paul Piper, Dave Crane', notes: 'Manage baggage drop from 07:00. Secure storage, efficient handback at finish.' },
  { id: 'FT3', role: 'Race HQ — Numbers Team', lead: 'Jason Drake', leadPhone: '07771719558', members: 'Marion Rayner (07894095919), Henrietta Marsh Smith (07825422192)', notes: 'Race number and timing chip issue. Sports Systems lead on timing setup.' },
  { id: 'FT4', role: 'Glasses / Water / Bananas', lead: 'Nick Lines', leadPhone: '07808935585', members: 'Alison TB (07812735697), Henrietta Marsh Smith (07825422192), Pete Robertson (07812144810)', notes: 'Pint glass and banana distribution at finish. Water cups from 5L bottles.' },
  { id: 'FT5', role: 'Shoe Tags', lead: 'Peter Jeffreys', leadPhone: null, members: 'Anna Solly (07746699555)', notes: 'Each must bring 1 clipper/scissors to cut shoe tags.' },
  { id: 'FT6', role: 'Marshal Co-ordinator', lead: 'Cristina Aldea', leadPhone: '07515900805', members: 'Andy Heale (07872350898) — deputy', notes: 'Overall marshal briefing and day-of coordination.' },
  { id: 'FT7', role: 'Bike Lead', lead: 'Robert Hutchinson', leadPhone: '07720402420', members: '', notes: 'Leads course cycle. Assisted mile marker setup the day before.' },
  { id: 'FT8', role: 'Tail Runner', lead: 'Jane Rowden', leadPhone: '07847166454', members: '', notes: 'Follows last competitor. Reports to Race Director on any runners still out at 10:30.' },
  { id: 'FT9', role: 'Photography', lead: 'Jez', leadPhone: '07825915188', members: '', notes: 'Race photography throughout the event.' },
  { id: 'FT10', role: 'Van Driver', lead: 'Andy Heale + Joe Heale', leadPhone: '07872350898', members: '', notes: 'Equipment transport to and from site.' },
  { id: 'FT11', role: 'Mile Markers (set up day before)', lead: 'Adolfas + Robert Hutchinson', leadPhone: '07568361153', members: 'Nick Lines checks all markers Sunday morning', notes: 'Set up Saturday. Nick Lines verifies all present first thing Sunday.' },
]

export const FIELD_SETUP = [
  { id: 'S1', label: 'Start/finish arch in position', owner: 'Sports Systems — Liam Burke', w3w: 'clouds.cliff.action', notes: 'Sports Systems handle transport and setup.', type: 'infra' },
  { id: 'S2', label: 'Registration gazebo set up', owner: 'Jason Drake + Sports Systems', w3w: 'clouds.cliff.action', notes: 'Race number collection, timing chip issue, participant queries.', type: 'infra' },
  { id: 'S3', label: 'Timing mats deployed', owner: 'Sports Systems — Liam Burke', w3w: 'clouds.cliff.action', notes: 'Chip timing mats at start and finish. Standby manual system ready.', type: 'infra' },
  { id: 'S4', label: 'Baggage drop tent set up', owner: 'Florian K', w3w: 'clouds.cliff.action', notes: 'Clearly marked, secure storage for runners.', type: 'infra' },
  { id: 'S5', label: 'Medical tent in position', owner: 'Jamie Cox — 07511 782590', w3w: 'clouds.cliff.action', notes: '1 paramedic, 1 EMT, rapid response vehicle, defibrillator.', type: 'infra' },
  { id: 'S6', label: '10 portable toilets positioned', owner: 'Loos for Dos', w3w: 'clouds.cliff.action', notes: 'Accessible within event zone, facing away from course.', type: 'infra' },
  { id: 'S7', label: "Jamie's Coffee van in position", owner: 'Jamie Karitzis', w3w: 'clouds.cliff.action', notes: 'Hot drinks only. No generator on site.', type: 'infra' },
  { id: 'S8', label: 'Sports Massage table set up', owner: "Steve O'Shea", w3w: 'clouds.cliff.action', notes: 'Table and equipment in designated area.', type: 'infra' },
  { id: 'S9', label: 'Up & Running sponsor gazebo', owner: 'Rick Wood', w3w: 'clouds.cliff.action', notes: 'Prizes, gels, sponsor branding.', type: 'infra' },
  { id: 'S10', label: 'Lampton sponsor in position', owner: 'Lampton', w3w: 'clouds.cliff.action', notes: 'Sponsor presence confirmed and set up.', type: 'infra' },
  { id: 'S11', label: 'Water & prize table ready', owner: 'Nick Lines', w3w: 'clouds.cliff.action', notes: '5L bottles, cups, prize distribution, pint glasses.', type: 'infra' },
  { id: 'S12', label: 'Field loop poles & tape deployed', owner: 'Rich Berry', w3w: 'clouds.cliff.action', notes: 'Clockwise 1-mile ODP field loop marked per aerial map.', type: 'field' },
  { id: 'S13', label: 'All route signs placed', owner: 'Signage team — Rich Berry', w3w: 'clouds.cliff.action', notes: 'Pre-race walk to place all direction and caution signs per signage plan.', type: 'field' },
  { id: 'S14', label: 'Mile markers confirmed', owner: 'Nick Lines', w3w: 'clouds.cliff.action', notes: 'Verify all mile markers placed Saturday by Adolfas and Robert.', type: 'field' },
]

export const SUPPLIERS = [
  { id: 'P1', name: 'J&B Medical', contact: 'Jamie Cox', phone: '07511782590', role: 'First aid & medical', by: '07:30' },
  { id: 'P2', name: 'Sports Systems', contact: 'Liam Burke', phone: null, role: 'Timing, entries & arch', by: '07:00' },
  { id: 'P3', name: 'Loos for Dos', contact: null, phone: null, role: '10 portable toilets', by: '07:00' },
  { id: 'P4', name: "Jamie's Coffee", contact: 'Jamie Karitzis', phone: null, role: 'Hot drinks van', by: '07:30' },
  { id: 'P5', name: 'Sports Massage', contact: "Steve O'Shea", phone: null, role: 'Post-race massage', by: '08:00' },
  { id: 'P6', name: 'Up & Running', contact: 'Rick Wood', phone: null, role: 'Prizes & sponsor', by: '07:30' },
  { id: 'P7', name: 'Lampton', contact: null, phone: null, role: 'Sponsor', by: '07:30' },
]

export const EMERGENCY = [
  { name: 'Emergency services', phone: '999', role: 'Police / Ambulance / Fire', priority: true },
  { name: 'West Middlesex Hospital', phone: '02085602121', role: 'A&E — Twickenham Rd, Isleworth TW7 6AF', priority: true },
  { name: 'J&B Medical — Jamie Cox', phone: '07511782590', role: 'First aid on site', priority: true },
  { name: 'Race Director — Adolfas', phone: '07568361153', role: 'Overall event command', priority: true },
  { name: 'Cristina Aldea', phone: '07515900805', role: 'Marshal co-ordinator', priority: false },
  { name: 'Andy Heale', phone: '07872350898', role: 'Deputy marshal / van', priority: false },
  { name: 'Zone 1 — Duncan Grassie', phone: '07752966637', role: 'Old Deer Park', priority: false },
  { name: 'Zone 2 — Andy Bowen', phone: '07713987025', role: 'Richmond area', priority: false },
  { name: 'Zone 3 — Tom Newman', phone: '07792281808', role: 'Ham & water station', priority: false },
  { name: 'Zone 4 — Andy Orchard', phone: '07747788876', role: 'Kingston area', priority: false },
  { name: 'Bike Lead — Robert Hutchinson', phone: '07720402420', role: 'Course cycle / sweep', priority: false },
  { name: 'Tail Runner — Jane Rowden', phone: '07847166454', role: 'Last competitor', priority: false },
  { name: 'Richmond Council (OOH)', phone: '02087442442', role: 'Park emergencies', priority: false },
]

export const INSPECTION_ITEMS = [
  { id: 'ground', label: 'Ground condition', desc: 'Event space ground, grass, holes, burns, bald areas' },
  { id: 'access', label: 'Access & egress routes', desc: 'Vehicle routes, entrance to site, barrier fencing, gates' },
  { id: 'fencing', label: 'Fencing & furniture', desc: 'Fences, signage, benches, park equipment' },
  { id: 'trees', label: 'Trees', desc: 'Damaged trees, broken or low hanging branches' },
  { id: 'litter', label: 'Litter & rubbish', desc: 'Commercial waste, bin bags, food spillages' },
  { id: 'vegetation', label: 'Vegetation', desc: 'Flower beds, shrubberies, bushes' },
  { id: 'other', label: 'Other', desc: 'Any other concerns' },
]

export const CONDITIONS = ['Perfect', 'General use', 'Minor damage', 'Heavy damage', 'Unusable']

export const PRIZE_CATEGORIES = [
  {
    section: 'Individual — ~10:00',
    type: 'individual',
    note: 'One runner, one prize. Overall position takes priority over age cat.',
    categories: [
      { id: 'man1', label: '1st Man', places: 1 },
      { id: 'man2', label: '2nd Man', places: 1 },
      { id: 'man3', label: '3rd Man', places: 1 },
      { id: 'wom1', label: '1st Woman', places: 1 },
      { id: 'wom2', label: '2nd Woman', places: 1 },
      { id: 'wom3', label: '3rd Woman', places: 1 },
    ]
  },
  {
    section: 'Age Categories — ~11:00',
    type: 'age',
    note: '1st, 2nd and 3rd place per category',
    categories: [
      { id: 'f3544', label: 'F35–44', places: 3 },
      { id: 'f4554', label: 'F45–54', places: 3 },
      { id: 'f55', label: 'F55+', places: 3 },
      { id: 'm4049', label: 'M40–49', places: 3 },
      { id: 'm5059', label: 'M50–59', places: 3 },
      { id: 'm60', label: 'M60+', places: 3 },
    ]
  },
  {
    section: 'Spot Prizes',
    type: 'spot',
    note: 'Name only required',
    categories: [
      { id: 'spot1', label: 'Spot Prize 1', places: 1 },
      { id: 'spot2', label: 'Spot Prize 2', places: 1 },
    ]
  }
]

export const MILE_MARKERS = [
  { id: 'MM1', label: 'Mile 1', notes: 'Outbound — field exit onto towpath' },
  { id: 'MM2', label: 'Mile 2', notes: 'Towpath south toward Richmond' },
  { id: 'MM3', label: 'Mile 3', notes: 'Richmond area' },
  { id: 'MM4', label: 'Mile 4', notes: 'Richmond Bridge / approach to Ham' },
  { id: 'MM5', label: 'Mile 5', notes: 'Ham — near water station' },
  { id: 'MM6', label: 'Mile 6', notes: 'Return leg — Ham toward Kingston' },
  { id: 'MM7', label: 'Mile 7', notes: 'Kingston approach' },
  { id: 'MM8', label: 'Mile 8', notes: 'Kingston turning point / return' },
  { id: 'MM9', label: 'Mile 9', notes: 'Final mile — approach to finish' },
]
