import { Cat, Dog, Rabbit, Bird, Fish, Bug, Squirrel, Turtle, Snail, Rat, PawPrint, Smile, Rocket, Crown, Gem, Flame, Ghost, Bot, Trophy, Sparkles, Rainbow, Heart, type LucideIcon } from "lucide-react";

/** خريطة مفاتيح الوجوه إلى أيقونات lucide — لا إيموجي في كل التطبيق. */
export const AVATAR_ICONS: Record<string, LucideIcon> = {
  // المجانية
  cat: Cat, dog: Dog, rabbit: Rabbit, bird: Bird, fish: Fish, bug: Bug,
  squirrel: Squirrel, turtle: Turtle, snail: Snail, rat: Rat, paw: PawPrint, smile: Smile,
  // متجر المكافآت
  rocket: Rocket, crown: Crown, gem: Gem, flame: Flame, ghost: Ghost, bot: Bot,
  trophy: Trophy, sparkles: Sparkles, rainbow: Rainbow, heart: Heart,
};

export const avatarIcon = (key: string): LucideIcon => AVATAR_ICONS[key] || Smile;

/** يعرض وجه الطفل كأيقونة. */
export default function Avatar({ name, className }: { name: string; className?: string }) {
  const Icon = avatarIcon(name);
  return <Icon className={className} />;
}
