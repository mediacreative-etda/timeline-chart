import { useEffect, useMemo, useState } from 'react';
import { addMonths, endOfMonth, format, parseISO, startOfMonth } from 'date-fns';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DbTask, useTimelineStore } from '@/store/timelineStore';
import ReportTimelinePreview from '@/components/ReportTimelinePreview';
import { formatBuddhistDate } from '@/lib/date-format';
import { STATUS_LABELS } from '@/types/timeline';

const intersectsRange = (task: DbTask, start: Date, end: Date) =>
  task.start_date <= format(end, 'yyyy-MM-dd') && task.end_date >= format(start, 'yyyy-MM-dd');

const getMonthValue = (date: Date) => format(date, 'yyyy-MM');

const getMonthStart = (monthValue: string) => startOfMonth(parseISO(`${monthValue}-01`));

const getMonthEnd = (monthValue: string) => endOfMonth(parseISO(`${monthValue}-01`));

const getMaxEndMonthValue = (monthValue: string) => getMonthValue(addMonths(getMonthStart(monthValue), 5));

const escapeCsvValue = (value: string | number | null | undefined) => {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
};

const downloadCsv = (filename: string, rows: string[][]) => {
  const csv = rows.map((row) => row.map(escapeCsvValue).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const Report = () => {
  const navigate = useNavigate();
  const { tasks, profiles, fetchTasks, fetchProfiles, loading } = useTimelineStore();
  const defaultMonthValue = useMemo(() => getMonthValue(new Date()), []);
  const [startMonth, setStartMonth] = useState(defaultMonthValue);
  const [endMonth, setEndMonth] = useState(defaultMonthValue);

  useEffect(() => {
    fetchTasks();
    fetchProfiles();
  }, [fetchProfiles, fetchTasks]);

  const handleStartMonthChange = (value: string) => {
    if (!value) return;
    const nextMaxEndMonth = getMaxEndMonthValue(value);
    setStartMonth(value);
    if (value > endMonth) {
      setEndMonth(value);
    } else if (endMonth > nextMaxEndMonth) {
      setEndMonth(nextMaxEndMonth);
    }
  };

  const handleEndMonthChange = (value: string) => {
    if (!value) return;
    const maxEndMonth = getMaxEndMonthValue(startMonth);
    if (value < startMonth) {
      setEndMonth(startMonth);
    } else if (value > maxEndMonth) {
      setEndMonth(maxEndMonth);
    } else {
      setEndMonth(value);
    }
  };

  const maxEndMonth = getMaxEndMonthValue(startMonth);
  const rangeStart = getMonthStart(startMonth);
  const rangeEnd = getMonthEnd(endMonth);

  const reportData = useMemo(() => {
    const scheduledTasks = tasks.filter((task) => intersectsRange(task, rangeStart, rangeEnd));

    const workloadEntries = [...profiles]
      .map((profile) => {
        const assigned = scheduledTasks.filter((task) => task.assigned_user_id === profile.user_id);
        return {
          userId: profile.user_id,
          name: profile.display_name || 'ไม่ระบุชื่อ',
          total: assigned.length,
        };
      })
      .filter((entry) => entry.total > 0);

    const unassignedCount = scheduledTasks.filter((task) => !task.assigned_user_id).length;
    if (unassignedCount > 0) {
      workloadEntries.push({
        userId: 'unassigned',
        name: 'ยังไม่ระบุผู้รับผิดชอบ',
        total: unassignedCount,
      });
    }

    return {
      scheduledTasks,
      workloadEntries,
    };
  }, [profiles, rangeEnd, rangeStart, tasks]);

  const handleExportCsv = () => {
    const profileById = new Map(profiles.map((profile) => [profile.user_id, profile.display_name || 'ไม่ระบุชื่อ']));
    const sortedTasks = [...reportData.scheduledTasks].sort((a, b) => {
      const startCompare = a.start_date.localeCompare(b.start_date);
      if (startCompare !== 0) return startCompare;

      const endCompare = a.end_date.localeCompare(b.end_date);
      if (endCompare !== 0) return endCompare;

      const assigneeA = a.assigned_user_id ? profileById.get(a.assigned_user_id) || '' : '';
      const assigneeB = b.assigned_user_id ? profileById.get(b.assigned_user_id) || '' : '';
      const assigneeCompare = assigneeA.localeCompare(assigneeB, 'th');
      if (assigneeCompare !== 0) return assigneeCompare;

      return a.title.localeCompare(b.title, 'th');
    });

    const rows = [
      ['ชื่องาน', 'รายละเอียด', 'ผู้รับผิดชอบ', 'สถานะ', 'วันที่เริ่ม', 'วันที่สิ้นสุด', 'วันที่เสร็จสิ้น'],
      ...sortedTasks.map((task) => [
        task.title,
        task.description || '',
        task.assigned_user_id ? profileById.get(task.assigned_user_id) || 'ไม่ระบุชื่อ' : '',
        STATUS_LABELS[task.status],
        formatBuddhistDate(parseISO(task.start_date)),
        formatBuddhistDate(parseISO(task.end_date)),
        task.completed_at ? formatBuddhistDate(parseISO(task.completed_at)) : '',
      ]),
    ];

    downloadCsv(`task-report-${startMonth}-to-${endMonth}.csv`, rows);
  };

  return (
    <div className="report-page min-h-screen bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.08),_transparent_38%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.45))] px-6 py-8 [font-family:'Noto_Sans_Thai',var(--font-sans)]">
      <div className="report-toolbar mx-auto flex max-w-[1180px] items-center justify-between gap-4 pb-6">
        <div className="report-period-controls flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label htmlFor="report-start-month" className="block text-xs font-semibold text-muted-foreground">
              เดือนเริ่มต้น
            </label>
            <input
              id="report-start-month"
              type="month"
              value={startMonth}
              onChange={(event) => handleStartMonthChange(event.target.value)}
              className="h-10 rounded-full border border-border bg-background px-4 text-sm font-semibold text-foreground outline-none transition-colors hover:border-primary/40 focus:border-primary"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="report-end-month" className="block text-xs font-semibold text-muted-foreground">
              เดือนสิ้นสุด
            </label>
            <input
              id="report-end-month"
              type="month"
              value={endMonth}
              onChange={(event) => handleEndMonthChange(event.target.value)}
              min={startMonth}
              max={maxEndMonth}
              className="h-10 rounded-full border border-border bg-background px-4 text-sm font-semibold text-foreground outline-none transition-colors hover:border-primary/40 focus:border-primary"
            />
          </div>
        </div>

        <div className="report-toolbar-actions flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => navigate('/')}>
            <ArrowLeft size={16} />
            กลับสู่ไทม์ไลน์
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleExportCsv} disabled={reportData.scheduledTasks.length === 0}>
            <Download size={16} />
            ส่งออก CSV
          </Button>
          <Button className="gap-2" onClick={() => window.print()}>
            <Printer size={16} />
            พิมพ์รายงาน
          </Button>
        </div>
      </div>

      <div className="report-preview-scroll">
        <div className="report-preview-stage">
          <div className="report-sheet-frame rounded-[32px] border border-border/70 bg-card/95 shadow-[0_24px_80px_hsl(var(--foreground)/0.10)] backdrop-blur">
            <div className="report-sheet">
              <div className="report-header flex items-start justify-between gap-5 border-b border-border pb-4">
                <div className="min-w-0">
                  <div className="mt-1.5 flex flex-wrap items-baseline gap-x-5 gap-y-1.5">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">สรุปผลการปฏิบัติงาน</h1>
                    <p className="text-sm text-muted-foreground">
                      ช่วงเวลา: {formatBuddhistDate(rangeStart)} ถึง {formatBuddhistDate(rangeEnd)}
                    </p>
                  </div>
                </div>

                <div className="report-header-side flex shrink-0 items-center">
                  <div className="report-total-card flex items-baseline gap-3 rounded-2xl border border-border bg-muted/20 px-4 py-3 text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">รวม</p>
                    <p className="text-3xl font-bold leading-none text-foreground">{reportData.scheduledTasks.length} งาน</p>
                  </div>
                </div>
              </div>

              {loading && tasks.length === 0 ? (
                <div className="py-20 text-center text-sm text-muted-foreground">กำลังโหลดข้อมูลรายงาน...</div>
              ) : (
                <div className="report-body pt-4">
                  <section className="report-section report-chart-section flex min-h-0 flex-col overflow-hidden rounded-3xl border border-border bg-muted/20 p-4">
                    <div className="report-chart-heading mb-3 shrink-0">
                      <h2 className="text-lg font-bold text-foreground">ไทม์ไลน์งานของทีม</h2>
                    </div>

                    <ReportTimelinePreview
                      tasks={reportData.scheduledTasks}
                      profiles={profiles}
                      rangeStart={rangeStart}
                      rangeEnd={rangeEnd}
                      asOfDate={rangeEnd}
                    />
                  </section>

                  <section className="report-section report-person-table flex min-h-0 flex-col overflow-hidden rounded-3xl border border-border bg-background/80 px-3.5 pt-3.5 pb-6">
                    <h3 className="text-[15px] font-bold leading-[1.3] text-foreground">จำนวนงานรวมรายบุคคล</h3>

                    {reportData.workloadEntries.length > 0 ? (
                      <div className="report-member-grid mt-2.5 mb-1 grid min-h-0 gap-1.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                        {reportData.workloadEntries.map((entry) => (
                          <div
                            key={entry.userId}
                            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 rounded-[18px] border border-border bg-card px-3.5 py-2.5 text-[12.5px] leading-5"
                          >
                            <span className="truncate font-medium leading-5 text-foreground">{entry.name}</span>
                            <span className="whitespace-nowrap text-right text-sm font-semibold leading-none text-foreground">
                              {entry.total} งาน
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-3 rounded-2xl border border-border px-4 py-7 text-center text-sm text-muted-foreground">
                        ยังไม่มีงานในช่วงรายงานนี้
                      </div>
                    )}
                  </section>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Report;
