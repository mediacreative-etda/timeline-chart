import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import {
  differenceInDays, addMonths, subMonths, startOfMonth, endOfMonth,
  format, eachMonthOfInterval, eachDayOfInterval, isToday, parseISO, max as dateMax, min as dateMin,
} from 'date-fns';
import { th } from 'date-fns/locale';
import { useTimelineStore, DbTask, Profile } from '@/store/timelineStore';
import { useAuth } from '@/hooks/useAuth';
import { TaskDisplayStatus } from '@/types/timeline';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import UserAvatar from './UserAvatar';
import TaskDetailPopover from './TaskDetailPopover';
import EditMemberDialog from './EditMemberDialog';
import { cn } from '@/lib/utils';
import { getTaskDisplayStatus } from '@/lib/taskStatus';
import { formatBuddhistDate } from '@/lib/date-format';

const statusStyles: Record<TaskDisplayStatus, string> = {
  not_started: 'bg-status-not-started',
  in_progress: 'bg-status-in-progress',
  completed: 'bg-status-completed',
  inactive: 'bg-status-inactive',
};

type TimelineDensity = 'default' | 'report-1m' | 'report-3m' | 'report-6m';

const densityConfigs: Record<
  TimelineDensity,
  {
    pixelsPerDay: number;
    rowHeight: number;
    taskHeight: number;
    taskGap: number;
    sidebarWidth: number;
    leftHeaderHeight: number;
    monthHeaderHeight: number;
    dayHeaderHeight: number;
    avatarSize: 'sm' | 'md';
    nameTextClass: string;
    metaTextClass: string;
    monthLabelClass: string;
    weekdayLabelClass: string;
    dayLabelClass: string;
    taskTextClass: string;
    taskPaddingX: number;
    minTaskWidth: number;
    showWeekdayLabel: boolean;
    dayLabelMode: 'full' | 'weekly' | 'monthly';
  }
> = {
  default: {
    pixelsPerDay: 40,
    rowHeight: 56,
    taskHeight: 32,
    taskGap: 4,
    sidebarWidth: 200,
    leftHeaderHeight: 60,
    monthHeaderHeight: 28,
    dayHeaderHeight: 32,
    avatarSize: 'md',
    nameTextClass: 'text-sm',
    metaTextClass: 'text-xs',
    monthLabelClass: 'text-xs font-semibold',
    weekdayLabelClass: 'text-[9px] uppercase',
    dayLabelClass: 'text-[11px] font-medium',
    taskTextClass: 'text-xs font-medium',
    taskPaddingX: 12,
    minTaskWidth: 30,
    showWeekdayLabel: true,
    dayLabelMode: 'full',
  },
  'report-1m': {
    pixelsPerDay: 18,
    rowHeight: 26,
    taskHeight: 14,
    taskGap: 3,
    sidebarWidth: 144,
    leftHeaderHeight: 52,
    monthHeaderHeight: 24,
    dayHeaderHeight: 28,
    avatarSize: 'sm',
    nameTextClass: 'text-xs',
    metaTextClass: 'text-[10px]',
    monthLabelClass: 'text-[10px] font-semibold',
    weekdayLabelClass: 'text-[8px] uppercase',
    dayLabelClass: 'text-[10px] font-medium',
    taskTextClass: 'text-[10px] font-medium',
    taskPaddingX: 8,
    minTaskWidth: 24,
    showWeekdayLabel: true,
    dayLabelMode: 'full',
  },
  'report-3m': {
    pixelsPerDay: 8,
    rowHeight: 24,
    taskHeight: 12,
    taskGap: 2,
    sidebarWidth: 148,
    leftHeaderHeight: 32,
    monthHeaderHeight: 18,
    dayHeaderHeight: 16,
    avatarSize: 'sm',
    nameTextClass: 'text-xs',
    metaTextClass: 'text-[9px]',
    monthLabelClass: 'text-[9px] font-semibold',
    weekdayLabelClass: 'text-[7px] uppercase',
    dayLabelClass: 'text-[8px] font-semibold',
    taskTextClass: 'text-[9px] font-medium',
    taskPaddingX: 6,
    minTaskWidth: 12,
    showWeekdayLabel: false,
    dayLabelMode: 'weekly',
  },
  'report-6m': {
    pixelsPerDay: 4.6,
    rowHeight: 22,
    taskHeight: 10,
    taskGap: 2,
    sidebarWidth: 132,
    leftHeaderHeight: 30,
    monthHeaderHeight: 16,
    dayHeaderHeight: 14,
    avatarSize: 'sm',
    nameTextClass: 'text-[11px]',
    metaTextClass: 'text-[9px]',
    monthLabelClass: 'text-[8px] font-semibold',
    weekdayLabelClass: 'text-[7px] uppercase',
    dayLabelClass: 'text-[7px] font-semibold',
    taskTextClass: 'text-[8px] font-medium',
    taskPaddingX: 4,
    minTaskWidth: 10,
    showWeekdayLabel: false,
    dayLabelMode: 'monthly',
  },
};

interface TimelineGridProps {
  tasks?: DbTask[];
  profiles?: Profile[];
  loading?: boolean;
  viewStart?: Date;
  viewEnd?: Date;
  showNavigation?: boolean;
  enableEditing?: boolean;
  enableTaskPopover?: boolean;
  statusAsOfDate?: Date;
  className?: string;
  density?: TimelineDensity;
  showTodayMarker?: boolean;
}

const TimelineGrid = ({
  tasks: tasksOverride,
  profiles: profilesOverride,
  loading: loadingOverride,
  viewStart: viewStartOverride,
  viewEnd: viewEndOverride,
  showNavigation = true,
  enableEditing = true,
  enableTaskPopover = true,
  statusAsOfDate,
  className,
  density = 'default',
  showTodayMarker = true,
}: TimelineGridProps = {}) => {
  const config = densityConfigs[density];
  const store = useTimelineStore();
  const { fetchTasks, fetchProfiles } = store;
  const tasks = tasksOverride ?? store.tasks;
  const profiles = profilesOverride ?? store.profiles;
  const loading = loadingOverride ?? (tasksOverride || profilesOverride ? false : store.loading);
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [openPopoverTaskId, setOpenPopoverTaskId] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [hoveredUserId, setHoveredUserId] = useState<string | null>(null);
  const [internalViewStart, setInternalViewStart] = useState(() => viewStartOverride ?? startOfMonth(new Date()));
  const [containerWidth, setContainerWidth] = useState(0);
  const usesExternalData = tasksOverride !== undefined || profilesOverride !== undefined || loadingOverride !== undefined;

  useEffect(() => {
    if (usesExternalData) {
      return;
    }

    fetchTasks();
    fetchProfiles();

    const refreshInterval = window.setInterval(() => {
      fetchTasks();
    }, 60000);

    return () => window.clearInterval(refreshInterval);
  }, [fetchTasks, fetchProfiles, usesExternalData]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const syncWidth = () => setContainerWidth(element.clientWidth);
    const syncWidthDeferred = () => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(syncWidth);
      });
    };

    syncWidth();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', syncWidth);
      window.addEventListener('beforeprint', syncWidthDeferred);
      window.addEventListener('afterprint', syncWidthDeferred);

      return () => {
        window.removeEventListener('resize', syncWidth);
        window.removeEventListener('beforeprint', syncWidthDeferred);
        window.removeEventListener('afterprint', syncWidthDeferred);
      };
    }

    const observer = new ResizeObserver(syncWidth);
    observer.observe(element);

    const mediaQuery = typeof window.matchMedia === 'function' ? window.matchMedia('print') : null;
    const handlePrintChange = () => syncWidthDeferred();

    window.addEventListener('resize', syncWidth);
    window.addEventListener('beforeprint', syncWidthDeferred);
    window.addEventListener('afterprint', syncWidthDeferred);
    mediaQuery?.addEventListener?.('change', handlePrintChange);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncWidth);
      window.removeEventListener('beforeprint', syncWidthDeferred);
      window.removeEventListener('afterprint', syncWidthDeferred);
      mediaQuery?.removeEventListener?.('change', handlePrintChange);
    };
  }, []);

  const activeViewStart = viewStartOverride ?? internalViewStart;

  const handlePrevMonth = useCallback(() => {
    if (!viewStartOverride) {
      setInternalViewStart((prev) => subMonths(prev, 1));
    }
  }, [viewStartOverride]);
  const handleNextMonth = useCallback(() => {
    if (!viewStartOverride) {
      setInternalViewStart((prev) => addMonths(prev, 1));
    }
  }, [viewStartOverride]);

  const projectStart = activeViewStart;
  const projectEnd = viewEndOverride ?? endOfMonth(addMonths(activeViewStart, 1));
  const totalDays = differenceInDays(projectEnd, projectStart) + 1;
  const effectivePixelsPerDay =
    density === 'default' || containerWidth === 0
      ? config.pixelsPerDay
      : Math.max(config.pixelsPerDay, Math.max(containerWidth - config.sidebarWidth, 0) / Math.max(totalDays, 1));
  const totalWidth = totalDays * effectivePixelsPerDay;

  // Group tasks by assigned_user_id and compute lanes for overlap stacking
  const tasksByUser = useMemo(() => {
    const map = new Map<string, DbTask[]>();
    tasks.forEach((t) => {
      const taskStart = parseISO(t.start_date);
      const taskEnd = parseISO(t.end_date);

      if (taskEnd < projectStart || taskStart > projectEnd) {
        return;
      }

      const uid = t.assigned_user_id || 'unassigned';
      const existing = map.get(uid) || [];
      existing.push(t);
      map.set(uid, existing);
    });
    return map;
  }, [projectEnd, projectStart, tasks]);

  // Assign lane indices for overlapping tasks per user
  const taskLanes = useMemo(() => {
    const lanes = new Map<string, number>();
    tasksByUser.forEach((userTasks) => {
      // Sort by start_date
      const sorted = [...userTasks].sort((a, b) => a.start_date.localeCompare(b.start_date));
      // Each lane tracks its end_date
      const laneEnds: string[] = [];
      sorted.forEach((task) => {
        let placed = false;
        for (let i = 0; i < laneEnds.length; i++) {
          if (task.start_date > laneEnds[i]) {
            laneEnds[i] = task.end_date;
            lanes.set(task.id, i);
            placed = true;
            break;
          }
        }
        if (!placed) {
          lanes.set(task.id, laneEnds.length);
          laneEnds.push(task.end_date);
        }
      });
    });
    return lanes;
  }, [tasksByUser]);

  // Compute max lanes per user for dynamic row height
  const userMaxLanes = useMemo(() => {
    const map = new Map<string, number>();
    tasksByUser.forEach((userTasks, userId) => {
      let max = 0;
      userTasks.forEach((t) => {
        const lane = taskLanes.get(t.id) || 0;
        if (lane + 1 > max) max = lane + 1;
      });
      map.set(userId, Math.max(max, 1));
    });
    return map;
  }, [tasksByUser, taskLanes]);

  const getRowHeight = useCallback((userId: string) => {
    const lanes = userMaxLanes.get(userId) || 1;
    const rowBuffer = density === 'default' ? 12 : 6;
    return Math.max(config.rowHeight, lanes * (config.taskHeight + config.taskGap) + rowBuffer);
  }, [config.rowHeight, config.taskGap, config.taskHeight, density, userMaxLanes]);

  // Show all profiles (not just those with tasks)
  const activeProfiles = profiles;
  const rowEntries = [
    ...activeProfiles.map((profile) => ({ userId: profile.user_id, profile })),
    ...(tasksByUser.has('unassigned') ? [{ userId: 'unassigned', profile: null as Profile | null }] : []),
  ];

  const getStripedRowClass = (index: number) => (index % 2 === 0 ? 'bg-card' : 'bg-muted/80');
  const getHoveredRowClass = (userId: string) => (
    hoveredUserId === userId ? 'bg-primary/10 ring-1 ring-inset ring-primary/20' : ''
  );
  const timelineRowGridStyle = {
    backgroundImage: `linear-gradient(to right, hsl(var(--timeline-grid)) 1px, transparent 1px)`,
    backgroundSize: `${effectivePixelsPerDay}px 100%`,
  };

  const days = useMemo(
    () => eachDayOfInterval({ start: projectStart, end: projectEnd }),
    [projectStart, projectEnd]
  );

  const getTaskBarStyle = useCallback(
    (task: DbTask) => {
      const start = dateMax([parseISO(task.start_date), projectStart]);
      const end = dateMin([parseISO(task.end_date), projectEnd]);
      const left = differenceInDays(start, projectStart) * effectivePixelsPerDay;
      const width = Math.max((differenceInDays(end, start) + 1) * effectivePixelsPerDay - Math.max(config.taskPaddingX / 2, 2), config.minTaskWidth);
      return { left: left + 4, width };
    },
    [config.minTaskWidth, config.taskPaddingX, effectivePixelsPerDay, projectEnd, projectStart]
  );

  const todayOffset = differenceInDays(new Date(), projectStart) * effectivePixelsPerDay;
  const showToday = showTodayMarker && todayOffset >= 0 && todayOffset <= totalWidth;

  // Pan state
  const [panning, setPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const handlePanStart = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.target === e.currentTarget)) {
      e.preventDefault();
      setPanning(true);
      panStart.current = {
        x: e.clientX, y: e.clientY,
        scrollLeft: scrollRef.current?.scrollLeft || 0,
        scrollTop: scrollRef.current?.scrollTop || 0,
      };
    }
  }, []);

  const handlePanMove = useCallback((e: React.MouseEvent) => {
    if (panning && scrollRef.current) {
      scrollRef.current.scrollLeft = panStart.current.scrollLeft - (e.clientX - panStart.current.x);
      scrollRef.current.scrollTop = panStart.current.scrollTop - (e.clientY - panStart.current.y);
    }
  }, [panning]);

  const handlePanEnd = useCallback(() => setPanning(false), []);

  const handleTaskClick = useCallback((taskId: string) => {
    setOpenPopoverTaskId((prev) => (prev === taskId ? null : taskId));
  }, []);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground">กำลังโหลด...</div>;
  }

  const shouldShowDayNumber = (day: Date) => {
    if (config.dayLabelMode === 'full') return true;
    if (config.dayLabelMode === 'weekly') return day.getDate() === 1 || day.getDay() === 1;
    return day.getDate() === 1;
  };

  return (
    <div ref={containerRef} className={cn("flex w-full flex-1 min-h-0 min-w-0 overflow-hidden", className)}>
      {/* Left panel */}
      <div className="shrink-0 border-r border-border bg-card z-10" style={{ width: config.sidebarWidth }}>
        <div
          className={cn(
            "border-b border-border flex items-center justify-between",
            density === 'default' ? 'px-3' : 'px-2.5'
          )}
          style={{ height: config.leftHeaderHeight }}
        >
          {showNavigation ? (
            <>
              <button onClick={handlePrevMonth} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ไทม์ไลน์</span>
              <button onClick={handleNextMonth} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <ChevronRight size={16} />
              </button>
            </>
          ) : (
            <span className="w-full text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">ไทม์ไลน์</span>
          )}
        </div>
        {rowEntries.map(({ userId, profile }, index) => (
          <div
            key={userId}
            className={cn(
              "flex items-center gap-3 px-4 border-b border-border transition-colors transition-shadow",
              getStripedRowClass(index),
              getHoveredRowClass(userId),
              profile && user && enableEditing && "cursor-pointer"
            )}
            style={{ height: getRowHeight(userId) }}
            onClick={() => profile && user && enableEditing && setEditingProfile(profile)}
            onMouseEnter={() => setHoveredUserId(userId)}
            onMouseLeave={() => setHoveredUserId((current) => current === userId ? null : current)}
          >
            {profile ? (
              <>
                <UserAvatar name={profile.display_name || 'User'} avatar_url={profile.avatar_url || ''} size={config.avatarSize} />
                <span className={cn(config.nameTextClass, "font-medium text-foreground truncate")}>{profile.display_name || 'สมาชิก'}</span>
              </>
            ) : (
              <span className={cn(config.nameTextClass, "font-medium text-muted-foreground truncate")}>-</span>
            )}
          </div>
        ))}
      </div>

      {/* Right panel: scrollable timeline */}
      <div
        ref={scrollRef}
        className={cn("flex-1 min-h-0 min-w-0 overflow-x-auto overflow-y-auto", panning && "cursor-grabbing")}
        onMouseDown={handlePanStart}
        onMouseMove={handlePanMove}
        onMouseUp={handlePanEnd}
        onMouseLeave={handlePanEnd}
      >
        <div style={{ width: totalWidth, minWidth: '100%', minHeight: '100%' }} className="relative">
          {/* Month + Day headers */}
          <div className="sticky top-0 bg-card z-10">
            <div className="border-b border-border flex relative" style={{ height: config.monthHeaderHeight }}>
              {eachMonthOfInterval({ start: projectStart, end: projectEnd }).map((month) => {
                const monthStart = month < projectStart ? projectStart : month;
                const monthEnd_ = endOfMonth(month) > projectEnd ? projectEnd : endOfMonth(month);
                const left = differenceInDays(monthStart, projectStart) * effectivePixelsPerDay;
                const width = (differenceInDays(monthEnd_, monthStart) + 1) * effectivePixelsPerDay;
                return (
                  <div
                    key={month.toISOString()}
                    className={cn("absolute top-0 flex items-center border-r border-border", density === 'default' ? 'px-3' : 'px-2')}
                    style={{ left, width, height: config.monthHeaderHeight }}
                  >
                    <span className={cn(config.monthLabelClass, "text-foreground")}>
                      {formatBuddhistDate(month, density === 'report-6m' ? 'MMM yyyy' : 'MMMM yyyy')}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="border-b border-border flex relative" style={{ height: config.dayHeaderHeight }}>
              {days.map((day) => {
                const left = differenceInDays(day, projectStart) * effectivePixelsPerDay;
                const today = isToday(day);
                const showDayNumber = shouldShowDayNumber(day);
                return (
                  <div
                    key={day.toISOString()}
                    className={cn("absolute top-0 flex flex-col items-center justify-center border-r border-border", today && "bg-primary/10")}
                    style={{ left, width: effectivePixelsPerDay, height: config.dayHeaderHeight }}
                  >
                    {config.showWeekdayLabel && (
                      <span className={cn(config.weekdayLabelClass, "text-muted-foreground", today && "text-primary font-bold")}>
                        {format(day, 'EEE', { locale: th })}
                      </span>
                    )}
                    {showDayNumber && (
                      <span className={cn(config.dayLabelClass, "text-foreground", today && "text-primary font-bold")}>
                        {format(day, 'd')}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Today marker */}
          {showToday && (
            <div className="absolute top-0 bottom-0 w-0.5 bg-primary z-20 pointer-events-none" style={{ left: todayOffset }}>
              <div className="absolute -top-0 -translate-x-1/2 whitespace-nowrap bg-primary px-1.5 py-0.5 text-[9px] font-bold leading-none text-primary-foreground rounded-b">
                วันนี้
              </div>
            </div>
          )}

          {/* Task rows */}
          {rowEntries.map(({ userId }, index) => {
            const userTasks = tasksByUser.get(userId) || [];
            const rowHeight = getRowHeight(userId);
            return (
              <div
                key={userId}
                className={cn(
                  "relative border-b border-border transition-colors transition-shadow",
                  getStripedRowClass(index),
                  getHoveredRowClass(userId)
                )}
                style={{ height: rowHeight }}
                onMouseEnter={() => setHoveredUserId(userId)}
                onMouseLeave={() => setHoveredUserId((current) => current === userId ? null : current)}
              >
                <div className="absolute inset-0 pointer-events-none" style={timelineRowGridStyle} />
                {userTasks.map((task) => {
                  const { left, width } = getTaskBarStyle(task);
                  const lane = taskLanes.get(task.id) || 0;
                  const top = 6 + lane * (config.taskHeight + config.taskGap);
                  const showTaskTitle = width >= (density === 'default' ? 36 : density === 'report-1m' ? 28 : 22);
                  const taskBar = (
                    <div
                      className={cn(
                        'absolute rounded-lg flex items-center px-3 transition-shadow z-10 shadow-sm hover:shadow-md',
                        enableTaskPopover && 'cursor-pointer',
                        statusStyles[getTaskDisplayStatus(task, statusAsOfDate)]
                      )}
                      style={{ left, width, top, height: config.taskHeight, paddingLeft: config.taskPaddingX, paddingRight: config.taskPaddingX }}
                      onClick={enableTaskPopover ? () => handleTaskClick(task.id) : undefined}
                    >
                      <span className={cn(config.taskTextClass, "text-primary-foreground truncate select-none")}>
                        {showTaskTitle ? task.title : ''}
                      </span>
                    </div>
                  );

                  if (!enableTaskPopover) {
                    return <div key={task.id}>{taskBar}</div>;
                  }

                  return (
                    <TaskDetailPopover
                      key={task.id} task={task}
                      open={openPopoverTaskId === task.id}
                      onOpenChange={(isOpen) => setOpenPopoverTaskId(isOpen ? task.id : null)}
                    >
                      {taskBar}
                    </TaskDetailPopover>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      {enableEditing && editingProfile && (
        <EditMemberDialog
          profile={editingProfile}
          open={!!editingProfile}
          onOpenChange={(open) => { if (!open) setEditingProfile(null); }}
        />
      )}
    </div>
  );
};

export default TimelineGrid;
