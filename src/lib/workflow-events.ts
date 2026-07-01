export const WORKFLOW_UPDATED_EVENT = "fc-workflow-updated";

/** Notify dashboard and other workflow views to refresh live stats. */
export function dispatchWorkflowUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WORKFLOW_UPDATED_EVENT));
}
