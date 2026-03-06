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
