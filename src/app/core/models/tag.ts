export interface Tag {
  id: string;
  user_id: string;
  label: string;
  color: string;
  created_at: string;
}

export interface TagCreate {
  label: string;
  color: string;
}