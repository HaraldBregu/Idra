export type WikiMetricName =
	| 'wiki_ingest_total'
	| 'wiki_ingest_failed_total'
	| 'wiki_pages_created_total'
	| 'wiki_pages_updated_total'
	| 'wiki_claims_added_total'
	| 'wiki_contradictions_detected_total'
	| 'wiki_queries_total'
	| 'wiki_query_fallback_to_raw_total'
	| 'wiki_lint_findings_total'
	| 'wiki_review_pending_total'
	| 'wiki_rollback_total';

export const wikiMetrics: Record<WikiMetricName, number> = {
	wiki_ingest_total: 0,
	wiki_ingest_failed_total: 0,
	wiki_pages_created_total: 0,
	wiki_pages_updated_total: 0,
	wiki_claims_added_total: 0,
	wiki_contradictions_detected_total: 0,
	wiki_queries_total: 0,
	wiki_query_fallback_to_raw_total: 0,
	wiki_lint_findings_total: 0,
	wiki_review_pending_total: 0,
	wiki_rollback_total: 0,
};

export function incrementWikiMetric(name: WikiMetricName, amount = 1): void {
	wikiMetrics[name] += amount;
}
