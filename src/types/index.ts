export interface Profile {
  id: string; username: string; display_name: string; bio: string; avatar_url: string; cover_url: string;
  theme_color: string; theme_font: string; accent_color: string; link_style: string; created_at: string;
}
export interface Link { id:string; user_id:string; label:string; url:string; icon:string; sort_order:number; is_active:boolean; clicks:number; created_at:string; }
export interface MicroblogPost { id:string; user_id:string; content:string; title:string; image_url:string; seo_title:string; seo_description:string; seo_keywords:string; button_text:string; button_url:string; is_pinned:boolean; created_at:string; }
export interface NewsletterLead { id:string; user_id:string; name:string; email:string; source:string; created_at:string; }
export interface PageVisit { id:string; user_id:string; visitor_referrer:string; created_at:string; }
export interface LinkClick { id:string; link_id:string; user_id:string; created_at:string; }
export interface Draft { id:string; user_id:string; title:string; content:string; created_at:string; updated_at:string; }
export interface SalesPage { id:string; user_id:string; slug:string; title:string; is_published:boolean; seo_title:string; seo_description:string; created_at:string; updated_at:string; }
export interface SalesBlock { id:string; page_id:string; user_id:string; block_type:string; content:string; settings:Record<string, unknown>; sort_order:number; created_at:string; }
export interface EmailConnection { user_id:string; smtp_host:string; smtp_port:number; smtp_user:string; from_name:string; from_email:string; created_at:string; }
export interface Campaign { id:string; user_id:string; subject:string; body:string; status:string; total_recipients:number; sent_count:number; error_count:number; last_error:string; created_at:string; updated_at:string; }
