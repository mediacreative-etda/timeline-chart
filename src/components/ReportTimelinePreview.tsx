import { differenceInCalendarMonths } from 'date-fns';
import { DbTask, Profile } from '@/store/timelineStore';
import TimelineGrid from './TimelineGrid';

interface ReportTimelinePreviewProps {
  tasks: DbTask[];
  profiles: Profile[];
  rangeStart: Date;
  rangeEnd: Date;
  asOfDate?: Date;
}

const ReportTimelinePreview = ({ tasks, profiles, rangeStart, rangeEnd, asOfDate = rangeEnd }: ReportTimelinePreviewProps) => {
  const monthCount = differenceInCalendarMonths(rangeEnd, rangeStart) + 1;
  const density = monthCount <= 1 ? 'report-1m' : monthCount <= 3 ? 'report-3m' : 'report-6m';

  return (
    <div className="report-timeline-shell min-h-0 min-w-0 flex-1 overflow-hidden">
      <TimelineGrid
        tasks={tasks}
        profiles={profiles}
        loading={false}
        viewStart={rangeStart}
        viewEnd={rangeEnd}
        showNavigation={false}
        enableEditing={false}
        enableTaskPopover={false}
        statusAsOfDate={asOfDate}
        showInactiveAsCompleted
        showTodayMarker={false}
        density={density}
        className="report-timeline-grid h-full rounded-[28px] border border-border bg-card"
      />
    </div>
  );
};

export default ReportTimelinePreview;
