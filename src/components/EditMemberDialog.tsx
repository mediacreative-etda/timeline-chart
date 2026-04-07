import { useState } from 'react';
import { useTimelineStore, Profile } from '@/store/timelineStore';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';

interface EditMemberDialogProps {
  profile: Profile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditMemberDialog = ({ profile, open, onOpenChange }: EditMemberDialogProps) => {
  const { updateProfile, deleteProfile } = useTimelineStore();
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(profile.display_name || '');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await updateProfile(profile.user_id, { display_name: name.trim() });
    toast({ title: 'อัปเดตสมาชิกแล้ว', description: `เปลี่ยนชื่อเป็น ${name.trim()} แล้ว` });
    onOpenChange(false);
  };

  const handleDelete = async () => {
    await deleteProfile(profile.user_id);
    toast({ title: 'ลบสมาชิกแล้ว', description: `${profile.display_name} ถูกนำออกจากทีมแล้ว` });
    onOpenChange(false);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>แก้ไขสมาชิก</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4" autoComplete="off">
          <div className="space-y-2">
            <Label htmlFor="edit-member-name">ชื่อ</Label>
            <Input
              id="edit-member-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ชื่อสมาชิก"
              required
            />
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="sm" className="gap-1.5">
                  <Trash2 size={14} />
                  ลบ
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>ลบสมาชิกนี้?</AlertDialogTitle>
                  <AlertDialogDescription>
                    การดำเนินการนี้จะนำ <strong>{profile.display_name}</strong> ออกจากทีม และงานของเขาจะถูกยกเลิกการมอบหมาย
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>นำออก</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
              <Button type="submit" disabled={!name.trim()}>บันทึก</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditMemberDialog;
