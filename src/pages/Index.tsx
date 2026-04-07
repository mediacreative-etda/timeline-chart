import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import TimelineHeader from '@/components/TimelineHeader';
import StatusLegend from '@/components/StatusLegend';
import TimelineGrid from '@/components/TimelineGrid';
import AddTaskDialog from '@/components/AddTaskDialog';
import AddMemberDialog from '@/components/AddMemberDialog';

const Index = () => {
  const { user } = useAuth();
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <TimelineHeader onAddTask={() => setAddTaskOpen(true)} onAddMember={() => setAddMemberOpen(true)} />
        <StatusLegend />
        <TimelineGrid />
      </div>
      {user && (
        <>
          <AddTaskDialog open={addTaskOpen} onOpenChange={setAddTaskOpen} />
          <AddMemberDialog open={addMemberOpen} onOpenChange={setAddMemberOpen} />
        </>
      )}
    </div>
  );
};

export default Index;
