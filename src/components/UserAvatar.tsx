import { cn } from '@/lib/utils';

interface UserAvatarProps {
  name: string;
  avatar_url?: string;
  size?: 'sm' | 'md';
}

const colors = [
  'bg-primary',
  'bg-status-in-progress',
  'bg-status-completed',
  'bg-destructive',
  'bg-accent-foreground',
];

const UserAvatar = ({ name, avatar_url, size = 'md' }: UserAvatarProps) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const colorIndex =
    name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold text-primary-foreground shrink-0',
        colors[colorIndex],
        size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'
      )}
    >
      {avatar_url ? (
        <img src={avatar_url} alt={name} className="w-full h-full rounded-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
};

export default UserAvatar;
