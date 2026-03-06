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
