/**
 * @fileoverview AlertDetailSkeleton Component
 * @description Loading skeleton for alert detail view
 * @version 1.0.0
 * @module alerts/components/AlertDetailSkeleton
 */

import React from "react";
import { Skeleton } from "../../ui/skeleton";

/**
 * AlertDetailSkeleton - Loading skeleton for alert details
 * @returns {JSX.Element} Skeleton loader component
 */
export const AlertDetailSkeleton = () => (
  <div className="space-y-6">
    <div className="grid gap-6 md:grid-cols-2">
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
    <Skeleton className="h-32 w-full rounded-xl" />
    <Skeleton className="h-96 w-full rounded-xl" />
  </div>
);
