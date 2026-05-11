import { useState } from 'react';
import { Plus, UserPlus, LogOut, Settings, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useTimelineStore } from '@/store/timelineStore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface TimelineHeaderProps {
  onAddTask: () => void;
  onAddMember: () => void;
}

const TimelineHeader = ({ onAddTask, onAddMember }: TimelineHeaderProps) => {
  const { session, user, signOut } = useAuth();
  const navigate = useNavigate();
  const { fetchTasks, maxOverlap, setMaxOverlap } = useTimelineStore();
  const { toast } = useToast();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [syncingApprovals, setSyncingApprovals] = useState(false);

  const syncApprovals = async () => {
    if (!session?.access_token) {
      toast({
        title: 'ไม่สามารถซิงก์ได้',
        description: 'กรุณาเข้าสู่ระบบก่อนซิงก์ข้อมูลงาน',
        variant: 'destructive',
      });
      return;
    }

    setSyncingApprovals(true);

    try {
      const response = await fetch('/api/sync-approvals', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error ?? 'ไม่สามารถซิงก์ข้อมูลงานได้');
      }

      await fetchTasks();

      toast({
        title: 'ซิงก์ข้อมูลงานแล้ว',
        description: `ดึง ${result?.fetched ?? 0} รายการ, อัปเดต ${result?.upserted ?? 0}, ลบ ${result?.deleted ?? 0}, ข้าม ${result?.skipped?.length ?? 0}`,
      });
    } catch (error) {
      toast({
        title: 'ซิงก์ไม่สำเร็จ',
        description: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดระหว่างซิงก์ข้อมูลงาน',
        variant: 'destructive',
      });
    } finally {
      setSyncingApprovals(false);
    }
  };

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
      <div>
        <h2 className="text-xl font-bold text-foreground">ไทม์ไลน์งาน</h2>
        {/*<p className="text-sm text-muted-foreground">View and manage all tasks</p>*/}
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <>
            <Button
              onClick={syncApprovals}
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={syncingApprovals}
            >
              <RefreshCw size={16} className={syncingApprovals ? 'animate-spin' : ''} />
              {syncingApprovals ? 'กำลังซิงก์...' : 'ซิงก์งาน'}
            </Button>
            <Button onClick={() => navigate('/report')} size="sm" variant="outline" className="gap-1.5">
              <FileSpreadsheet size={16} />
              รายงาน
            </Button>
            <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Settings size={16} />
                  ตั้งค่า
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-foreground">ตั้งค่าไทม์ไลน์</h4>
                  <div className="space-y-1.5">
                    <Label htmlFor="max-overlap" className="text-xs text-muted-foreground">
                      จำนวนงานซ้อนสูงสุดต่อคน
                    </Label>
                    <Input
                      id="max-overlap"
                      type="number"
                      min={1}
                      max={10}
                      value={maxOverlap}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (val >= 1 && val <= 10) setMaxOverlap(val);
                      }}
                      className="h-8 text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      สมาชิกแต่ละคนมีงานซ้อนได้พร้อมกันสูงสุด {maxOverlap} งาน
                    </p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button onClick={onAddMember} size="sm" variant="outline" className="gap-1.5">
              <UserPlus size={16} />
              เพิ่มสมาชิก
            </Button>
            <Button onClick={onAddTask} size="sm" className="gap-1.5">
              <Plus size={16} />
              เพิ่มงาน
            </Button>
            <Button onClick={signOut} size="sm" variant="ghost" className="gap-1.5 text-muted-foreground">
              <LogOut size={16} />
            </Button>
          </>
        ) : (
          <Button onClick={() => navigate('/auth')} size="sm" variant="outline">
            เข้าสู่ระบบ
          </Button>
        )}
      </div>
    </div>
  );
};

export default TimelineHeader;
