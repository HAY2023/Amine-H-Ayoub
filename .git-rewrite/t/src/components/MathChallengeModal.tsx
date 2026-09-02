import ParentalGateModal from "./ParentalGateModal";

export default function MathChallengeModal({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  return <ParentalGateModal onSuccess={onSuccess} onCancel={onCancel} />;
}
