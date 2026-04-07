import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { STATUS_LABELS, TaskStatus } from '@/types/timeline';
import { useTimelineStore, DbTask } from '@/store/timelineStore';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Trash2, CalendarDays, User, FileText } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { getTaskDisplayStatus } from '@/lib/taskStatus';
import { formatBuddhistDateFromISO } from '@/lib/date-format';

interface TaskDetailPopoverProps {
  task: DbTask;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

const statusDot: Record<TaskStatus, string> = {
  not_started: 'bg-status-not-started',
  in_progress: 'bg-status-in-progress',
  completed: 'bg-status-completed',
};

const TaskDetailPopover = ({ task, open, onOpenChange, children }: TaskDetailPopoverProps) => {
  const { updateTask, deleteTask, profiles, getOverlapCount, maxOverlap } = useTimelineStore();
  const { user } = useAuth();
  const { toast } = useToast();
  const isLoggedIn = !!user;
  const displayStatus = getTaskDisplayStatus(task);

  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [titleValue, setTitleValue] = useState(task.title);
  const [descValue, setDescValue] = useState(task.description || '');
  const [startDatePickerOpen, setStartDatePickerOpen] = useState(false);
  const [endDatePickerOpen, setEndDatePickerOpen] = useState(false);

  const handleStatusChange = (status: string) => {
    if (!isLoggedIn) return;
    updateTask(task.id, { status: status as TaskStatus });
  };

  const handleDelete = () => {
    if (!isLoggedIn) return;
    deleteTask(task.id);
    onOpenChange(false);
  };

  const handleDateChange = (field: 'start' | 'end', date: Date | undefined) => {
    if (!date || !isLoggedIn) return;
    const iso = format(date, 'yyyy-MM-dd');

    if (field === 'start') {
      if (iso > task.end_date) return;
      updateTask(task.id, { start_date: iso });
      setStartDatePickerOpen(false);
    } else {
      if (iso < task.start_date) return;
      updateTask(task.id, { end_date: iso });
      setEndDatePickerOpen(false);
    }
  };

  const saveTitle = () => {
    if (titleValue.trim() && titleValue.trim() !== task.title) {
      updateTask(task.id, { title: titleValue.trim() });
    }
    setEditingTitle(false);
  };

  const saveDesc = () => {
    if (descValue !== (task.description || '')) {
      updateTask(task.id, { description: descValue });
    }
    setEditingDesc(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          if (editingTitle && titleValue.trim() && titleValue.trim() !== task.title) {
            updateTask(task.id, { title: titleValue.trim() });
          }
          if (editingDesc && descValue !== (task.description || '')) {
            updateTask(task.id, { description: descValue });
          }
          setEditingTitle(false);
          setEditingDesc(false);
          setStartDatePickerOpen(false);
          setEndDatePickerOpen(false);
        }
        onOpenChange(nextOpen);
      }}
    >
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 p-0" side="bottom" align="start" onMouseDown={(e) => e.stopPropagation()}>
        <div className="space-y-4 p-4">
          <div>
            {editingTitle && isLoggedIn ? (
              <input
                className="w-full border-b border-primary bg-transparent pb-0.5 text-sm font-semibold text-foreground outline-none"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTitle();
                  if (e.key === 'Escape') {
                    setTitleValue(task.title);
                    setEditingTitle(false);
                  }
                }}
                autoFocus
              />
            ) : (
              <h3
                className={cn('text-sm font-semibold text-foreground', isLoggedIn && 'cursor-pointer transition-colors hover:text-primary')}
                onClick={() => {
                  if (isLoggedIn) {
                    setTitleValue(task.title);
                    setEditingTitle(true);
                  }
                }}
              >
                {task.title}
              </h3>
            )}

            {editingDesc && isLoggedIn ? (
              <textarea
                className="mt-1 w-full resize-none rounded border border-border bg-transparent p-1.5 text-xs text-muted-foreground outline-none focus:border-primary"
                value={descValue}
                onChange={(e) => setDescValue(e.target.value)}
                onBlur={saveDesc}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setDescValue(task.description || '');
                    setEditingDesc(false);
                  }
                }}
                rows={2}
                autoFocus
                placeholder="เพิ่มรายละเอียด..."
              />
            ) : (
              <p
                className={cn(
                  'mt-1 flex items-start gap-1.5 text-xs text-muted-foreground',
                  isLoggedIn && 'cursor-pointer transition-colors hover:text-foreground'
                )}
                onClick={() => {
                  if (isLoggedIn) {
                    setDescValue(task.description || '');
                    setEditingDesc(true);
                  }
                }}
              >
                <FileText className="mt-0.5 h-3 w-3 shrink-0" />
                {task.description || (isLoggedIn ? 'เพิ่มรายละเอียด...' : 'ไม่มีรายละเอียด')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">วันที่</label>
            <div className="flex items-center gap-2">
              <Popover open={startDatePickerOpen} onOpenChange={setStartDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 flex-1 justify-start gap-1.5 text-xs"
                    disabled={!isLoggedIn}
                  >
                    <CalendarDays className="h-3 w-3" />
                    {formatBuddhistDateFromISO(task.start_date)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" side="bottom">
                  <Calendar
                    mode="single"
                    selected={parseISO(task.start_date)}
                    defaultMonth={parseISO(task.start_date)}
                    onSelect={(date) => handleDateChange('start', date)}
                    disabled={(date) => date > parseISO(task.end_date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <span className="text-xs text-muted-foreground">ถึง</span>

              <Popover open={endDatePickerOpen} onOpenChange={setEndDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 flex-1 justify-start gap-1.5 text-xs"
                    disabled={!isLoggedIn}
                  >
                    <CalendarDays className="h-3 w-3" />
                    {formatBuddhistDateFromISO(task.end_date)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" side="bottom">
                  <Calendar
                    mode="single"
                    selected={parseISO(task.end_date)}
                    defaultMonth={parseISO(task.end_date)}
                    onSelect={(date) => handleDateChange('end', date)}
                    disabled={(date) => date < parseISO(task.start_date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">ผู้รับผิดชอบ</label>
            <Select
              value={task.assigned_user_id ?? undefined}
              onValueChange={(value) => {
                if (!isLoggedIn) return;
                const newUserId = value;

                if (newUserId) {
                  const overlap = getOverlapCount(newUserId, task.start_date, task.end_date, task.id);
                  if (overlap >= maxOverlap) {
                    const member = profiles.find((profile) => profile.user_id === newUserId);
                    toast({
                      title: 'เกินจำนวนงานซ้อนสูงสุด',
                      description: `${member?.display_name || 'สมาชิกคนนี้'} มีงานซ้อนอยู่ ${overlap} งานแล้ว (สูงสุด ${maxOverlap})`,
                      variant: 'destructive',
                    });
                    return;
                  }
                }

                updateTask(task.id, { assigned_user_id: newUserId });
              }}
              disabled={!isLoggedIn}
            >
              <SelectTrigger className="h-8 text-xs">
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3" />
                  <SelectValue placeholder="à¹€à¸¥à¸·à¸­à¸à¸ªà¸¡à¸²à¸Šà¸´à¸" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {profiles.map((profile) => (
                  <SelectItem key={profile.user_id} value={profile.user_id} className="text-xs">
                    {profile.display_name || 'ไม่ระบุชื่อ'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">สถานะ</label>
            <Select value={task.status} onValueChange={handleStatusChange} disabled={!isLoggedIn}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((statusKey) => (
                  <SelectItem key={statusKey} value={statusKey} className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className={cn('h-2 w-2 rounded-full', statusDot[statusKey])} />
                      {STATUS_LABELS[statusKey]}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {displayStatus === 'inactive' && (
              <p className="text-[11px] text-muted-foreground">
                งานนี้แสดงเป็นสถานะไม่ใช้งาน เพราะเสร็จสิ้นเกิน 7 วันแล้ว
              </p>
            )}
          </div>

          {isLoggedIn && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="w-full gap-1.5 text-xs">
                  <Trash2 className="h-3.5 w-3.5" />
                  ลบงาน
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>ลบ "{task.title}"?</AlertDialogTitle>
                  <AlertDialogDescription>การดำเนินการนี้ไม่สามารถย้อนกลับได้</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>ลบ</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {!isLoggedIn && <p className="text-center text-xs text-muted-foreground">เข้าสู่ระบบเพื่อแก้ไขงาน</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default TaskDetailPopover;
