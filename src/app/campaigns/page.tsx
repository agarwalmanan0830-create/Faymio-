"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CampaignList } from "@/components/campaign-list";
import { OperationsList } from "@/components/operations-list";
function Content() {
  const params = useSearchParams();
  const view = params.get("view") || "";
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">THE WORK, IN MOTION</div>
          <h1>
            Campaigns<span className="accent-dot">.</span>
          </h1>
          <p>From the first brief to the final frame.</p>
        </div>
        <div className="heading-aside">
          <span className="status-live" />
          Every update, in one place
        </div>
      </div>
      <OperationsList view={view} />
      <CampaignList />
    </div>
  );
}
export default function Campaigns() {
  return (
    <Suspense
      fallback={
        <div className="page">
          <div className="skeleton big-skeleton" />
        </div>
      }
    >
      <Content />
    </Suspense>
  );
}
