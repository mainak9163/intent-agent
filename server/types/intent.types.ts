export interface IntentClassificationRequest {
  prompt: string;
  mode?: "online" | "offline";
  locale?: string;
  organizationContext?: {
    orgType?: string;
    environment?: string;
    logSources?: string[];
  };
}

export interface IntentClassificationResponse {
  intent_class_id: string;
  intent_class_label: string;
  candidate_subclasses: string[];
  confidence: number;
  analysis_goals: string[];
  suggested_filters: {
    time_window: string;
    entities: string[];
    log_sources: string[];
  };
  metrics_of_interest: string[];
  analysis_techniques: string[];
  mode: string;
  reporting: {
    summary_scale: string[];
    priority: string;
    notes_for_report_agent: string;
  };
  reasoning: string;
}
