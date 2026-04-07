const items = [
  { label: 'รอดำเนินการ', className: 'bg-status-not-started' },
  { label: 'กำลังดำเนินการ', className: 'bg-status-in-progress' },
  { label: 'เสร็จสิ้น', className: 'bg-status-completed' },
  { label: 'ไม่ใช้งาน', className: 'bg-status-inactive' },
];

const StatusLegend = () => (
  <div className="flex items-center gap-5 px-6 py-2.5 border-b border-border bg-card">
    {items.map((item) => (
      <div key={item.label} className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-sm ${item.className}`} />
        <span className="text-xs text-muted-foreground font-medium">{item.label}</span>
      </div>
    ))}
  </div>
);

export default StatusLegend;
