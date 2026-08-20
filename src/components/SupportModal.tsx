import SupportChat from "./SupportChat";

export default function SupportModal({ onClose }: { onClose: () => void }) {
  return <SupportChat onClose={onClose} />;
}
