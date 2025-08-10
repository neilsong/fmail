import type { Email } from "@/components/email/EmailListItem";

export const emails: Email[] = [
  {
    id: 2,
    from: "Michael Brown",
    email: "michael@example.com",
    subject: "Product Roadmap Review",
    preview: `All,

Let's schedule a meeting to review the updated product roadmap. I've included the key initiatives we need to discuss.

Agenda:
1. Feature prioritization
2. Resource allocation
3. Timeline adjustments
4. Risk assessment

Proposed times:
- Tomorrow 10 AM
- Thursday 2 PM

Please confirm your availability.

Best,
Michael`,
    time: "9:15 AM",
    unread: true,
    hasAttachment: false,
  },
  {
    id: 1,
    from: "Sarah Johnson",
    email: "sarah@example.com",
    subject: "Q3 Progress Report",
    preview: `Team,

Here's our Q3 progress update. We've achieved significant milestones across all departments.

Key Metrics:
• Revenue growth: 15% QoQ
• Customer retention: 92%
• New feature adoption: 78%

Next Steps:
1. Finalize Q4 roadmap
2. Prepare for annual review
3. Optimize operational workflows

Please review the attached report and share your feedback.

Best regards,
Sarah`,
    time: "10:30 AM",
    unread: true,
    hasAttachment: true,
  },
  {
    id: 6,
    from: "James Anderson",
    email: "james@example.com",
    subject: "Security Policy Update",
    preview: `Team,

We're implementing new security policies effective next week. Key changes include:

1. Mandatory 2FA for all systems
2. Enhanced password requirements
3. New data access protocols
4. Regular security audits

Please review the attached document and complete the required training by Friday.

Best regards,
James`,
    time: "Yesterday",
    unread: true,
    hasAttachment: true,
  },
  {
    id: 7,
    from: "Rachel Green",
    email: "rachel@example.com",
    subject: "Marketing Campaign Update",
    preview: `Team,

Here's the latest update on our Q4 marketing campaign:

1. Social media ads performing 20% above target
2. Email open rates at 45%
3. Website traffic up 35%
4. Conversion rate steady at 8%

Next Steps:
1. Optimize ad spend
2. Launch new content series
3. Prepare for holiday campaign

Let's discuss in our weekly meeting.

Best,
Rachel`,
    time: "11:45 AM",
    unread: true,
    hasAttachment: true,
  },
  {
    id: 3,
    from: "Emily Davis",
    email: "emily@example.com",
    subject: "Budget Planning Meeting",
    preview: `Team,

We need to finalize the budget for next quarter. Please prepare your department's requirements.

Key Areas:
1. Marketing spend
2. R&D allocation
3. Operational costs
4. Contingency planning

Meeting Details:
Date: Friday
Time: 11 AM
Location: Conference Room B

Best,
Emily`,
    time: "Yesterday",
    unread: false,
    hasAttachment: false,
  },
  {
    id: 4,
    from: "David Wilson",
    email: "david@example.com",
    subject: "Client Proposal Draft",
    preview: `Team,

Attached is the draft for the upcoming client proposal. Please review and provide feedback.

Sections:
1. Executive Summary
2. Solution Overview
3. Implementation Plan
4. Pricing Structure
5. Case Studies

Deadline for feedback: EOD Friday.

Best regards,
David`,
    time: "Yesterday",
    unread: false,
    hasAttachment: true,
  },
  {
    id: 5,
    from: "Laura Martinez",
    email: "laura@example.com",
    subject: "Team Offsite Planning",
    preview: `All,

Let's plan our next team offsite. I've outlined some potential options:

Options:
1. Strategy Workshop
   - 2-day intensive
   - Focus on long-term planning
   - Includes team-building activities

2. Innovation Summit
   - 3-day event
   - Guest speakers
   - Hackathon included

3. Leadership Retreat
   - 1-day session
   - Focus on management skills
   - Includes coaching sessions

Please vote for your preferred option by Wednesday.

Best,
Laura`,
    time: "Yesterday",
    unread: false,
    hasAttachment: false,
  },
  {
    id: 8,
    from: "Mark Taylor",
    email: "mark@example.com",
    subject: "IT Infrastructure Upgrade",
    preview: `All,

We're planning a major IT infrastructure upgrade next month. Key details:

1. New server installation
2. Network security enhancements
3. Software updates
4. Backup system improvements

Please review the attached schedule and let me know of any conflicts.

Best regards,
Mark`,
    time: "3:20 PM",
    unread: false,
    hasAttachment: true,
  },
];
