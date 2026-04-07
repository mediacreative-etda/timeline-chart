import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { AlertTriangle, CalendarDays, CheckCircle } from 'lucide-react';
import { useTimelineStore } from '@/store/timelineStore';
import { useAuth } from '@/hooks/useAuth';
import { TaskStatus } from '@/types/timeline';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { STATUS_LABELS } from '@/types/timeline';
import { formatBuddhistDateFromISO } from '@/lib/date-format';

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AddTaskDialog = ({ open, onOpenChange }: AddTaskDialogProps) => {
  const { profiles, addTask } = useTimelineStore();
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<TaskStatus>('not_started');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [startPickerOpen, setStartPickerOpen] = useState(false);
  const [endPickerOpen, setEndPickerOpen] = useState(false);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStartDate('');
    setEndDate('');
    setStatus('not_started');
    setAssignedUserId('');
    setStartPickerOpen(false);
    setEndPickerOpen(false);
  };

  const conflictInfo = useMemo(() => {
    if (!assignedUserId || !startDate || !endDate) return null;

    const { tasks, maxOverlap } = useTimelineStore.getState();
    const conflicting = tasks.filter(
      (task) =>
        task.assigned_user_id === assignedUserId &&
        task.start_date <= endDate &&
        task.end_date >= startDate
    );

    const member = profiles.find((profile) => profile.user_id === assignedUserId);
    const name = member?.display_name || 'สมาชิกคนนี้';

    if (conflicting.length >= maxOverlap) {
      return { available: false, name, tasks: conflicting, count: conflicting.length, maxOverlap };
    }

    if (conflicting.length > 0) {
      return { available: true, name, tasks: conflicting, count: conflicting.length, maxOverlap, hasOverlap: true };
    }

    return { available: true, name, tasks: [], count: 0, maxOverlap, hasOverlap: false };
  }, [assignedUserId, endDate, profiles, startDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate || !endDate || !assignedUserId || !user) return;

    if (conflictInfo && !conflictInfo.available) {
      toast({
        title: 'เกินจำนวนงานซ้อนสูงสุด',
        description: `${conflictInfo.name} มีงานซ้อนอยู่ ${conflictInfo.count} งานแล้ว (สูงสุด ${conflictInfo.maxOverlap}) ในช่วง ${formatBuddhistDateFromISO(startDate)} ถึง ${formatBuddhistDateFromISO(endDate)}`,
        variant: 'destructive',
      });
      return;
    }

    await addTask({
      title: title.trim(),
      description: description.trim(),
      start_date: startDate,
      end_date: endDate,
      status,
      assigned_user_id: assignedUserId,
      created_by: user.id,
    });

    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) resetForm();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>เพิ่มงาน</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div className="space-y-2">
            <Label htmlFor="task-title">ชื่องาน</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ระบุชื่องาน"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-desc">รายละเอียด</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>วันที่เริ่ม</Label>
              <Popover open={startPickerOpen} onOpenChange={setStartPickerOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-between font-normal">
                    <span className={startDate ? 'text-foreground' : 'text-muted-foreground'}>
                      {startDate ? formatBuddhistDateFromISO(startDate) : 'เลือกวันที่'}
                    </span>
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate ? parseISO(startDate) : undefined}
                    defaultMonth={startDate ? parseISO(startDate) : undefined}
                    onSelect={(date) => {
                      if (!date) return;
                      const nextStart = format(date, 'yyyy-MM-dd');
                      setStartDate(nextStart);
                      if (endDate && nextStart > endDate) setEndDate('');
                      setStartPickerOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>วันที่สิ้นสุด</Label>
              <Popover open={endPickerOpen} onOpenChange={setEndPickerOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-between font-normal">
                    <span className={endDate ? 'text-foreground' : 'text-muted-foreground'}>
                      {endDate ? formatBuddhistDateFromISO(endDate) : 'เลือกวันที่'}
                    </span>
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate ? parseISO(endDate) : undefined}
                    defaultMonth={endDate ? parseISO(endDate) : (startDate ? parseISO(startDate) : undefined)}
                    onSelect={(date) => {
                      if (!date) return;
                      const nextEnd = format(date, 'yyyy-MM-dd');
                      if (startDate && nextEnd < startDate) return;
                      setEndDate(nextEnd);
                      setEndPickerOpen(false);
                    }}
                    disabled={(date) => (startDate ? date < parseISO(startDate) : false)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label>มอบหมายให้</Label>
            <Select value={assignedUserId} onValueChange={setAssignedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกสมาชิก" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((profile) => (
                  <SelectItem key={profile.user_id} value={profile.user_id}>
                    {profile.display_name || 'ไม่ระบุชื่อ'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {conflictInfo && (
            <div
              className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
                !conflictInfo.available
                  ? 'border-destructive/30 bg-destructive/10 text-destructive'
                  : conflictInfo.hasOverlap
                    ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                    : 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400'
              }`}
            >
              {!conflictInfo.available ? (
                <>
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <span>
                      <strong>{conflictInfo.name}</strong> มีงานซ้อนถึงขีดจำกัดแล้ว ({conflictInfo.count}/{conflictInfo.maxOverlap}):
                    </span>
                    <ul className="mt-1 list-inside list-disc text-xs opacity-80">
                      {conflictInfo.tasks.map((task) => (
                        <li key={task.id}>
                          {task.title} ({formatBuddhistDateFromISO(task.start_date)} - {formatBuddhistDateFromISO(task.end_date)})
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : conflictInfo.hasOverlap ? (
                <>
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <strong>{conflictInfo.name}</strong> มีงานซ้อนอยู่ {conflictInfo.count}/{conflictInfo.maxOverlap} งาน งานใหม่จะถูกวางต่อในแถวถัดไป
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <strong>{conflictInfo.name}</strong> ว่างสำหรับช่วงเวลานี้
                  </span>
                </>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>สถานะ</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as TaskStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((statusKey) => (
                  <SelectItem key={statusKey} value={statusKey}>
                    {STATUS_LABELS[statusKey]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || !startDate || !endDate || !assignedUserId || (conflictInfo ? !conflictInfo.available : false)}
            >
              สร้างงาน
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTaskDialog;
