import React from "react";
import { CircleDot, Phone, CheckCircle, Trophy, AlertTriangle, AlertCircle, Minus, LucideIcon } from "lucide-react";

type StatusType = "NEW" | "CONTACTED" | "INTERESTED" | "CONVERTED";
type PriorityType = "HIGH" | "MEDIUM" | "LOW";

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

interface PriorityBadgeProps {
  priority: PriorityType;
  className?: string;
}

const statusConfig: Record<StatusType, { icon: LucideIcon; color: string; label: string }> = {
  NEW: {
    icon: CircleDot,
    color: "bg-blue-50 text-blue-700 border-blue-200",
    label: "New"
  },
  CONTACTED: {
    icon: Phone,
    color: "bg-purple-50 text-purple-700 border-purple-200",
    label: "Contacted"
  },
  INTERESTED: {
    icon: CheckCircle,
    color: "bg-amber-50 text-amber-700 border-amber-200",
    label: "Interested"
  },
  CONVERTED: {
    icon: Trophy,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    label: "Converted"
  }
};

const priorityConfig: Record<PriorityType, { icon: LucideIcon; color: string; label: string }> = {
  HIGH: {
    icon: AlertTriangle,
    color: "bg-red-50 text-red-700 border-red-300 font-semibold",
    label: "High"
  },
  MEDIUM: {
    icon: AlertCircle,
    color: "bg-yellow-50 text-yellow-700 border-yellow-200",
    label: "Medium"
  },
  LOW: {
    icon: Minus,
    color: "bg-gray-50 text-gray-600 border-gray-200",
    label: "Low"
  }
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.NEW;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${config.color} ${className}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}

export function PriorityBadge({ priority, className = "" }: PriorityBadgeProps) {
  const config = priorityConfig[priority] || priorityConfig.MEDIUM;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${config.color} ${className}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}
