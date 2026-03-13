export interface Profile {
  id: string
  created_datetime_utc: string | null
  modified_datetime_utc: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  is_superadmin: boolean
  is_in_study: boolean
  is_matrix_admin: boolean
}

export interface Image {
  id: string
  created_datetime_utc: string
  modified_datetime_utc: string | null
  url: string | null
  is_common_use: boolean | null
  profile_id: string | null
  additional_context: string | null
  is_public: boolean | null
  image_description: string | null
  celebrity_recognition: string | null
  // embedding omitted — not useful in the UI
}

export interface Caption {
  id: string
  created_datetime_utc: string
  modified_datetime_utc: string | null
  content: string | null
  is_public: boolean
  profile_id: string
  image_id: string
  humor_flavor_id: number | null
  is_featured: boolean
  caption_request_id: number | null
  like_count: number
  llm_prompt_chain_id: number | null
}

// ─── Humor ───────────────────────────────────────────────────────────────────

export interface HumorFlavor {
  id: number
  created_datetime_utc: string
  description: string | null
  slug: string
}

export interface HumorFlavorStep {
  id: number
  created_datetime_utc: string
  humor_flavor_id: number
  llm_temperature: number | null
  order_by: number
  llm_input_type_id: number
  llm_output_type_id: number
  llm_model_id: number
  humor_flavor_step_type_id: number
  llm_system_prompt: string | null
  llm_user_prompt: string | null
  description: string | null
}

export interface HumorFlavorMix {
  id: number
  created_datetime_utc: string
  humor_flavor_id: number
  caption_count: number
}

export interface HumorFlavorStepType {
  id: number
  created_at: string
  slug: string
  description: string
}

// ─── Terms ───────────────────────────────────────────────────────────────────

export interface Term {
  id: number
  created_datetime_utc: string
  modified_datetime_utc: string | null
  term: string
  definition: string
  example: string
  priority: number
  term_type_id: number | null
}

export interface TermType {
  id: number
  created_datetime_utc: string
  name: string
}

// ─── Captions ────────────────────────────────────────────────────────────────

export interface CaptionRequest {
  id: number
  created_datetime_utc: string
  profile_id: string
  image_id: string
}

export interface CaptionExample {
  id: number
  created_datetime_utc: string
  modified_datetime_utc: string | null
  image_description: string
  caption: string
  explanation: string
  priority: number
  image_id: string | null
}

// ─── LLM ─────────────────────────────────────────────────────────────────────

export interface LlmProvider {
  id: number
  created_datetime_utc: string
  name: string
}

export interface LlmModel {
  id: number
  created_datetime_utc: string
  name: string
  llm_provider_id: number
  provider_model_id: string
  is_temperature_supported: boolean
}

export interface LlmInputType {
  id: number
  created_datetime_utc: string
  description: string
  slug: string
}

export interface LlmOutputType {
  id: number
  created_datetime_utc: string
  description: string
  slug: string
}

export interface LlmPromptChain {
  id: number
  created_datetime_utc: string
  caption_request_id: number
}

export interface LlmModelResponse {
  id: string
  created_datetime_utc: string
  llm_model_response: string | null
  processing_time_seconds: number
  llm_model_id: number
  profile_id: string
  caption_request_id: number
  llm_system_prompt: string
  llm_user_prompt: string
  llm_temperature: number | null
  humor_flavor_id: number
  llm_prompt_chain_id: number | null
  humor_flavor_step_id: number | null
}

// ─── Access Control ──────────────────────────────────────────────────────────

export interface AllowedSignupDomain {
  id: number
  created_datetime_utc: string
  apex_domain: string
}

export interface WhitelistEmailAddress {
  id: number
  created_datetime_utc: string
  modified_datetime_utc: string | null
  email_address: string
}
