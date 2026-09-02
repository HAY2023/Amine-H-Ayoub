import { useNavigate } from "react-router-dom";
import SupportChat from "@/components/SupportChat";

export default function SupportPage() {
  const navigate = useNavigate();

  return <SupportChat pageMode onClose={() => navigate(-1)} />;
}
