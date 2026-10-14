/**
 * AI - Spin & Solve: Problem Statements Data
 * College Technical Symposium
 * Theme: "AI can build it. You must understand it."
 * 
 * Five finalized problem statements for the symposium.
 * Each statement contains complete descriptions, target stakeholders,
 * required features, technical constraints, reasoning challenges,
 * permitted build boundaries, and expected deliverables.
 */

export const PROBLEM_STATEMENTS = [
  {
    id: "PS-01",
    index: 0,
    title: "Campus Lost & Found",
    shortTitle: "Lost & Found",
    category: "Campus Utility",
    color: "#0284c7", // Sky Blue
    scenario:
      "Students frequently lose belongings such as ID cards, water bottles, earphones and bags on campus. Finding the owner or locating an item can be difficult when information is scattered across class groups or word of mouth.",
    targetUsers:
      "Campus students, faculty, facility staff, and lost-and-found desk coordinators.",
    requiredFeatures: [
      "Allow users to report items as Lost or Found.",
      "Display reported items and support search and filtering.",
      "Allow users to submit a claim for a matching item.",
      "Display claim status."
    ],
    constraints: [
      "Use sample or manually entered data.",
      "Do not publicly expose sensitive personal information.",
      "Keep reporting and searching simple enough for a short prototype.",
      "Image upload and authentication are optional."
    ],
    reasoningChallenge: [
      "How can users distinguish between similar items?",
      "What information is useful for matching an item while protecting privacy?",
      "How should multiple claims for the same item be handled?"
    ],
    permittedBuild: [
      "A lost/found report form and item listing.",
      "Search and filter controls.",
      "A claim action with visible claim status.",
      "Sample data and simple status updates; a production backend is not required."
    ],
    expectedDeliverable:
      "A working lost-item reporting, search and claim system."
  },
  {
    id: "PS-02",
    index: 1,
    title: "Smart Event Registration",
    shortTitle: "Event Registration",
    category: "Event Management",
    color: "#2563eb", // Royal Blue
    scenario:
      "College symposium organizers need an efficient way to register participants and manage event entry. Long queues and manual checking can slow down entry, while duplicate registrations or check-ins can create inaccurate attendance records.",
    targetUsers:
      "Symposium event organizers, desk registration volunteers, student coordinators, and event attendees.",
    requiredFeatures: [
      "Register participants.",
      "Generate unique registration tokens.",
      "Search participants by name or token.",
      "Mark participants as checked in.",
      "Prevent duplicate check-ins and display a clear message."
    ],
    constraints: [
      "Use simulated registration data.",
      "Do not integrate with real payment gateways or official college systems.",
      "Tokens must be unique within the prototype.",
      "QR scanning and email delivery are optional."
    ],
    reasoningChallenge: [
      "What if two participants have similar names?",
      "How can organizers quickly verify a registration?",
      "What should happen when a token is invalid or already used?"
    ],
    permittedBuild: [
      "A registration form and participant list.",
      "A generated registration token.",
      "Search functionality.",
      "A check-in flow with duplicate prevention and visible status.",
      "Local or in-memory sample data."
    ],
    expectedDeliverable:
      "A working registration and check-in dashboard."
  },
  {
    id: "PS-03",
    index: 2,
    title: "Campus Complaint Tracker",
    shortTitle: "Complaint Tracker",
    category: "Issue Management",
    color: "#0d9488", // Teal
    scenario:
      "Campus issues such as broken lights, water leaks and damaged classroom equipment need an organized reporting and tracking system. Without a shared view of complaints, issues may be missed, duplicated or left unresolved.",
    targetUsers:
      "Campus facilities management, maintenance supervisors, department estate staff, faculty, and students.",
    requiredFeatures: [
      "Submit complaints with category, location and description.",
      "Display submitted complaints.",
      "Update complaint status.",
      "Assign priority using simple rules.",
      "Filter complaints by status."
    ],
    constraints: [
      "Use sample campus locations and simulated complaints.",
      "No real maintenance-system integration is required.",
      "Priority rules must be simple and explainable.",
      "Use a manageable set of complaint categories and statuses."
    ],
    reasoningChallenge: [
      "Which details help staff understand and locate an issue?",
      "How should safety hazards be prioritized against minor issues?",
      "How can users distinguish new, ongoing and resolved complaints?"
    ],
    permittedBuild: [
      "A complaint form and complaint list.",
      "Status updates such as Open, In Progress and Resolved.",
      "A simple rule-based priority label.",
      "Status filters and a dashboard summary.",
      "Maps, login and notifications are optional."
    ],
    expectedDeliverable:
      "A working complaint-tracking dashboard."
  },
  {
    id: "PS-04",
    index: 3,
    title: "Smart Canteen Pre-Order System",
    shortTitle: "Canteen Pre-Order",
    category: "Campus Convenience",
    color: "#7c3aed", // Violet / Purple
    scenario:
      "Students spend time waiting in canteen queues, especially during breaks. A pre-order interface could let students select food before reaching the counter and understand the total cost and order status.",
    targetUsers:
      "Canteen counter staff, food service managers, student diners, and faculty during campus breaks.",
    requiredFeatures: [
      "Display a food menu with prices.",
      "Add and remove items from a cart.",
      "Calculate the total bill.",
      "Place a simulated order.",
      "Display order status, such as Placed, Preparing or Ready."
    ],
    constraints: [
      "Use a sample menu and simulated orders.",
      "Do not integrate real payments or a live canteen system.",
      "Clearly label orders as simulated.",
      "Stock tracking, delivery, coupons and user accounts are optional."
    ],
    reasoningChallenge: [
      "How can the total cost be made clear before ordering?",
      "What happens when the cart is empty?",
      "How can order status help students decide when to collect food?"
    ],
    permittedBuild: [
      "A menu with prices and add/remove controls.",
      "A cart with quantities and calculated total.",
      "A simulated order placement flow.",
      "An order confirmation and status display.",
      "Sample menu data and front-end state are sufficient."
    ],
    expectedDeliverable:
      "A working menu, cart and order-management interface."
  },
  {
    id: "PS-05",
    index: 4,
    title: "Campus Emergency Resource Finder",
    shortTitle: "Emergency Finder",
    category: "Safety and Accessibility",
    color: "#0891b2", // Cyan
    scenario:
      "During an emergency, students may not know where to find first-aid facilities, emergency contacts or available campus assistance. A clear directory can help users find resources quickly and identify alternatives when a resource is unavailable.",
    targetUsers:
      "Campus health center staff, security desk officers, student wardens, residential students, and campus visitors.",
    requiredFeatures: [
      "Display emergency contacts and campus resources.",
      "Filter resources by type or location.",
      "Show contact information and availability status.",
      "Provide emergency guidance and fallback options.",
      "Simulate resource status updates."
    ],
    constraints: [
      "Use clearly labelled sample campus data unless verified official details are supplied.",
      "Never present simulated availability as live or verified.",
      "Direct users in urgent danger to official emergency services or designated campus authorities.",
      "Keep critical information easy to find."
    ],
    reasoningChallenge: [
      "How can users find the right resource quickly under stress?",
      "What alternative should be shown if a resource is unavailable?",
      "How can the interface distinguish verified details from simulated status?"
    ],
    permittedBuild: [
      "A searchable emergency resource directory.",
      "Filters for resource type or location.",
      "Availability labels and simulated status updates.",
      "Fallback guidance directing users to another resource or official emergency assistance.",
      "A simple list or card layout is sufficient."
    ],
    expectedDeliverable:
      "A searchable emergency resource directory that handles unavailable resources responsibly."
  }
];

// Alias for compatibility
export const PROBLEMS = PROBLEM_STATEMENTS;

export function getProblemById(id) {
  return PROBLEM_STATEMENTS.find((p) => p.id === id) || null;
}

export function getProblemByIndex(index) {
  const normalizedIndex =
    ((index % PROBLEM_STATEMENTS.length) + PROBLEM_STATEMENTS.length) %
    PROBLEM_STATEMENTS.length;
  return PROBLEM_STATEMENTS[normalizedIndex];
}
