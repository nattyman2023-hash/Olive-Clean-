import { AlertTriangle } from "lucide-react";
import type { RouteJob, Employee } from "../RoutesTab";

const SERVICE_CERT_MAP: Record<string, string> = {
  "deep-clean": "Deep Clean Certified",
  "signature-deep-clean": "Debbie Sardone Method",
  "eco-friendly": "Green Clean Pro",
};

interface Props {
  job: RouteJob;
  employee: Employee | undefined;
}

export default function ConstraintWarning({ job, employee }: Props) {
  if (!employee) return null;
  const requiredCert = SERVICE_CERT_MAP[job.service];
  if (!requiredCert) return null;

  const certs = (employee.certifications as string[]) || [];
  if (certs.includes(requiredCert)) return null;

  return (
    <span className="inline-flex items-center gap-1 text-[0.6rem] text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-full">
      <AlertTriangle className="h-2.5 w-2.5" />
      Missing: {requiredCert}
    </span>
  );
}
