import React from 'react';

interface StatutoryDeadline {
  id: string;
  day: string;
  month: string;
  title: string;
  subtitle: string;
  statutoryAct: string;
  statusText?: string;
  urgency?: 'urgent' | 'upcoming';
}

const DEADLINES: StatutoryDeadline[] = [
  {
    id: "dl-1",
    day: "07",
    month: "Nov",
    title: "TDS / TCS deposit for October",
    subtitle: "Challan ITNS 281 payment for Section 194C, 194J, 194Q deductions",
    statutoryAct: "Rule 30, Income Tax Rules",
    statusText: "Due tomorrow",
    urgency: "urgent"
  },
  {
    id: "dl-2",
    day: "11",
    month: "Nov",
    title: "GSTR-1 monthly return",
    subtitle: "Outward supplies statement for regular taxpayers for October",
    statutoryAct: "Section 37, CGST Act",
    statusText: "In 5 days"
  },
  {
    id: "dl-3",
    day: "20",
    month: "Nov",
    title: "GSTR-3B monthly return and ITC settlement",
    subtitle: "Summary return, tax payment, and GSTR-2B ITC claim settlement",
    statutoryAct: "Section 39, CGST Act"
  },
  {
    id: "dl-4",
    day: "30",
    month: "Nov",
    title: "Corporate income tax return (Audit assessees)",
    subtitle: "ITR-6 for corporate taxpayers requiring statutory Tax Audit report Form 3CA/3CD",
    statutoryAct: "Section 139(1)"
  }
];

export const DeadlinesView: React.FC = () => {
  return (
    <div className="cockpit-wrap space-y-6">
      <div>
        <h1 className="cockpit-h1">Deadlines</h1>
        <p className="cockpit-sub">
          Statutory compliance calendar for October / November 2024
        </p>
      </div>

      <div className="border-t border-[#262a33]">
        {DEADLINES.map((dl) => (
          <div
            key={dl.id}
            className="flex items-start gap-5 py-4 border-b border-[#262a33]"
          >
            {/* Plain date block */}
            <div className="w-12 text-center shrink-0 pt-0.5">
              <span className="text-xl font-medium text-[#e8eaf0] tabular-nums block leading-tight">
                {dl.day}
              </span>
              <span className="text-xs text-[#8a909c] block">
                {dl.month}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-medium text-[#e8eaf0] truncate">{dl.title}</h2>
                {dl.statusText && (
                  <span className={`text-xs ${dl.urgency === 'urgent' ? 'text-[#ff6b6b]' : 'text-[#f5b754]'}`}>
                    {dl.statusText}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8a909c] mt-0.5 leading-relaxed">{dl.subtitle}</p>
              <div className="text-xs text-[#8a909c] mt-1.5">
                {dl.statutoryAct}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
