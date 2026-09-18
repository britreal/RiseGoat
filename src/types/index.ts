export interface Profile {
  id: string; username: string; display_name: string; bio: string; avatar_url: string; cover_url: string;
  theme_color: string; theme_font: string; accent_color: string; link_style: string; seo_title: string; seo_description: string; seo_image_url: string; created_at: string;
}
export interface Link { id:string; user_id:string; label:string; url:string; icon:string; link_type:string; description:string; thumbnail_url:string; sensitive:boolean; product_price:string; product_currency:string; sort_order:number; is_active:boolean; clicks:number; created_at:string; }
export interface MicroblogPost { id:string; user_id:string; content:string; title:string; image_url:string; seo_title:string; seo_description:string; seo_keywords:string; button_text:string; button_url:string; is_pinned:boolean; created_at:string; }
export interface NewsletterLead { id:string; user_id:string; name:string; email:string; source:string; created_at:string; }
export interface PageVisit { id:string; user_id:string; visitor_referrer:string; created_at:string; }
export interface LinkClick { id:string; link_id:string; user_id:string; created_at:string; }
export interface Draft { id:string; user_id:string; title:string; content:string; created_at:string; updated_at:string; }
export interface SalesPage { id:string; user_id:string; slug:string; title:string; is_published:boolean; seo_title:string; seo_description:string; created_at:string; updated_at:string; }
export interface SalesBlock { id:string; page_id:string; user_id:string; block_type:string; content:string; settings:Record<string, unknown>; sort_order:number; created_at:string; }
export interface EmailConnection { user_id:string; smtp_host:string; smtp_port:number; smtp_user:string; from_name:string; from_email:string; created_at:string; }
export interface Campaign { id:string; user_id:string; subject:string; body:string; status:string; total_recipients:number; sent_count:number; error_count:number; last_error:string; created_at:string; updated_at:string; }
export interface AuthorityProperty {
  id:string; user_id:string; name:string; property_type:string; platform:string; url:string; description:string; status:string; objective:string; tags:string; files:unknown[]; created_at:string; updated_at:string;
}
export interface AuthorityContact {
  id:string; user_id:string; name:string; email:string; telegram:string; occupation:string; status:string; strategic_value:string; next_action:string; next_action_at:string|null; tags:string; files:unknown[]; created_at:string; updated_at:string;
}
export interface AuthorityConnection {
  id:string; user_id:string; origin_id:string; origin_type:'property'|'contact'; destination_id:string; destination_type:'property'|'contact'; connection_type:string; description:string; strength:string; created_at:string;
}
export interface AuthorityTask {
  id:string; user_id:string; title:string; entity_id:string|null; entity_type:'property'|'contact'|null; task_type:string; priority:string; due_date:string|null; status:string; created_at:string; updated_at:string;
}
export interface AuthorityContent {
  id:string; user_id:string; title:string; property_id:string|null; content_type:string; status:string; link:string; views:number; clicks:number; conversions:number; published_at:string|null; tags:string; created_at:string; updated_at:string;
}
export interface AuthorityOpportunity {
  id:string; user_id:string; opportunity:string; involved:string; estimated_value:number; status:string; your_part:string; notes:string; created_at:string; updated_at:string;
}
export interface ReciprocityEntry {
  id:string; user_id:string; contact_id:string; favor_given:string; favor_received:string; value_given:number; value_received:number; entry_date:string; context:string; created_at:string;
}
export interface LeverageNode {
  id:string; user_id:string; entity_id:string; entity_type:'property'|'contact'; connection_degree:number; centrality:number; decision_power:number; resources:number; score:number; created_at:string; updated_at:string;
}
export interface ProductPipelineItem {
  id:string; user_id:string; product:string; product_type:string; status:string; channel:string; monthly_revenue:number; margin:number; created_at:string; updated_at:string;
}
export interface Commission {
  id:string; user_id:string; business_value:number; rate:number; payment_method:string; status:string; due_date:string|null; received_at:string|null; created_at:string;
}
export interface ContactDossier {
  id:string; user_id:string; contact_id:string; wants:string; fears:string; failed_before:string; allies:string; rivals:string; public_secret:string; created_at:string; updated_at:string;
}
export interface AuthorityThreat {
  id:string; user_id:string; title:string; category:string; severity:string; source_url:string; evidence:string; status:string; linked_entity_id:string|null; linked_entity_type:'property'|'contact'|null; detected_at:string; due_date:string|null; response_summary:string; created_at:string; updated_at:string;
}
export interface DefenseAction {
  id:string; user_id:string; threat_id:string; action_type:string; status:string; action_title:string; response_text:string; created_at:string; executed_at:string|null;
}
export interface AuthoritySuggestion {
  id:string; user_id:string; source_entity_id:string; source_entity_type:'property'|'contact'; target_entity_id:string; target_entity_type:'property'|'contact'; score:number; reason:string; status:string; created_at:string; updated_at:string;
}
export interface AuthoritySource {
  id:string; user_id:string; source_type:string; name:string; url:string; status:string; last_checked_at:string|null; metadata:Record<string,unknown>; created_at:string;
}
export interface NegotiationDossier {
  id:string; user_id:string; contact_id:string; history:string; style:string; limits:string; triggers:string; alternatives:string; created_at:string; updated_at:string;
}
export interface HiddenConnection {
  id:string; user_id:string; person_a:string; person_b:string; relation:string; source:string; strength:string; created_at:string;
}
export interface CrossInfluence {
  id:string; user_id:string; influencer:string; influenced:string; intensity:number; topic:string; created_at:string;
}
export interface NodeMonetization {
  id:string; user_id:string; entity_id:string; entity_type:'property'|'contact'; direct_revenue:number; indirect_revenue:number; cost:number; roi:number; created_at:string; updated_at:string;
}
