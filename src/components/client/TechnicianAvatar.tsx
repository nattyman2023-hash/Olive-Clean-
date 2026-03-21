import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Props {
  name: string;
  photoUrl: string | null;
}

export default function TechnicianAvatar({ name, photoUrl }: Props) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-1.5">
      <Avatar className="h-5 w-5">
        {photoUrl && <AvatarImage src={photoUrl} alt={name} />}
        <AvatarFallback className="text-[0.5rem] bg-primary/10 text-primary">{initials}</AvatarFallback>
      </Avatar>
      <span className="text-[0.65rem] text-muted-foreground">{name}</span>
    </div>
  );
}
