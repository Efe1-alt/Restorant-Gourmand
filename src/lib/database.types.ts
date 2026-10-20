
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "audit_log": {
                  Row: {
                    "action": string,"actor": string,"actor_id": string | null,"created_at": string,"details": NonNullable<Json>,"entity": string,"entity_id": string | null,"id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor": string,"actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"entity": string,"entity_id"?: string | null,"id"?: never
                  }
                  Update: {
                    "action"?: string,"actor"?: string,"actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"entity"?: string,"entity_id"?: string | null,"id"?: never
                  }
                  Relationships: [
                    
                  ]
                },"business_hours": {
                  Row: {
                    "closes": string,"kind": string,"opens": string,"weekday": number
                  }
                  ComputedFields: never
                  Insert: {
                    "closes": string,"kind": string,"opens": string,"weekday": number
                  }
                  Update: {
                    "closes"?: string,"kind"?: string,"opens"?: string,"weekday"?: number
                  }
                  Relationships: [
                    
                  ]
                },"categories": {
                  Row: {
                    "created_at": string,"id": number,"is_hidden": boolean,"name_bg": string,"name_en": string | null,"slug": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: never,"is_hidden"?: boolean,"name_bg": string,"name_en"?: string | null,"slug": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: never,"is_hidden"?: boolean,"name_bg"?: string,"name_en"?: string | null,"slug"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"closures": {
                  Row: {
                    "closed_on": string,"created_at": string,"note": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "closed_on": string,"created_at"?: string,"note"?: string | null
                  }
                  Update: {
                    "closed_on"?: string,"created_at"?: string,"note"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"dishes": {
                  Row: {
                    "allergens": (string)[],"allergens_verified": boolean,"archived_at": string | null,"category_id": number,"created_at": string,"description_bg": string,"description_en": string | null,"en_status": string,"id": number,"image_path": string | null,"import_notes": string | null,"is_standing": boolean,"is_visible": boolean,"name_bg": string,"name_en": string | null,"price_cents": number,"slug": string,"sort_order": number,"standing_daily_cap": number | null,"updated_at": string,"weight": string
                  }
                  ComputedFields: never
                  Insert: {
                    "allergens"?: (string)[],"allergens_verified"?: boolean,"archived_at"?: string | null,"category_id": number,"created_at"?: string,"description_bg"?: string,"description_en"?: string | null,"en_status"?: string,"id"?: never,"image_path"?: string | null,"import_notes"?: string | null,"is_standing"?: boolean,"is_visible"?: boolean,"name_bg": string,"name_en"?: string | null,"price_cents": number,"slug": string,"sort_order"?: number,"standing_daily_cap"?: number | null,"updated_at"?: string,"weight"?: string
                  }
                  Update: {
                    "allergens"?: (string)[],"allergens_verified"?: boolean,"archived_at"?: string | null,"category_id"?: number,"created_at"?: string,"description_bg"?: string,"description_en"?: string | null,"en_status"?: string,"id"?: never,"image_path"?: string | null,"import_notes"?: string | null,"is_standing"?: boolean,"is_visible"?: boolean,"name_bg"?: string,"name_en"?: string | null,"price_cents"?: number,"slug"?: string,"sort_order"?: number,"standing_daily_cap"?: number | null,"updated_at"?: string,"weight"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "dishes_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"districts": {
                  Row: {
                    "created_at": string,"fee_cents": number,"id": number,"is_active": boolean,"name_bg": string,"name_en": string | null,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"fee_cents": number,"id"?: never,"is_active"?: boolean,"name_bg": string,"name_en"?: string | null,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"fee_cents"?: number,"id"?: never,"is_active"?: boolean,"name_bg"?: string,"name_en"?: string | null,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"email_outbox": {
                  Row: {
                    "attempts": number,"created_at": string,"html": string,"id": number,"idempotency_key": string,"kind": string,"last_error": string | null,"next_attempt_at": string,"order_id": number | null,"provider_message_id": string | null,"sent_at": string | null,"status": string,"subject": string,"text_body": string,"to_address": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"created_at"?: string,"html": string,"id"?: never,"idempotency_key": string,"kind": string,"last_error"?: string | null,"next_attempt_at"?: string,"order_id"?: number | null,"provider_message_id"?: string | null,"sent_at"?: string | null,"status"?: string,"subject": string,"text_body": string,"to_address"?: string | null
                  }
                  Update: {
                    "attempts"?: number,"created_at"?: string,"html"?: string,"id"?: never,"idempotency_key"?: string,"kind"?: string,"last_error"?: string | null,"next_attempt_at"?: string,"order_id"?: number | null,"provider_message_id"?: string | null,"sent_at"?: string | null,"status"?: string,"subject"?: string,"text_body"?: string,"to_address"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "email_outbox_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"menu_day_dishes": {
                  Row: {
                    "dish_id": number,"menu_date": string,"portions": number,"reserved": number,"sold_out": boolean,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "dish_id": number,"menu_date": string,"portions": number,"reserved"?: number,"sold_out"?: boolean,"sort_order"?: number
                  }
                  Update: {
                    "dish_id"?: number,"menu_date"?: string,"portions"?: number,"reserved"?: number,"sold_out"?: boolean,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "menu_day_dishes_dish_id_fkey"
      columns: ["dish_id"]
isOneToOne: false
      referencedRelation: "dishes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "menu_day_dishes_menu_date_fkey"
      columns: ["menu_date"]
isOneToOne: false
      referencedRelation: "menu_days"
      referencedColumns: ["menu_date"]
    }
                  ]
                },"menu_days": {
                  Row: {
                    "created_at": string,"menu_date": string,"published_at": string | null,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"menu_date": string,"published_at"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"menu_date"?: string,"published_at"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"order_items": {
                  Row: {
                    "dish_id": number | null,"id": number,"line_total_cents": number,"name_bg": string,"name_en": string | null,"order_id": number,"quantity": number,"stock_kind": string,"unit_price_cents": number,"weight": string
                  }
                  ComputedFields: never
                  Insert: {
                    "dish_id"?: number | null,"id"?: never,"line_total_cents": number,"name_bg": string,"name_en"?: string | null,"order_id": number,"quantity": number,"stock_kind": string,"unit_price_cents": number,"weight"?: string
                  }
                  Update: {
                    "dish_id"?: number | null,"id"?: never,"line_total_cents"?: number,"name_bg"?: string,"name_en"?: string | null,"order_id"?: number,"quantity"?: number,"stock_kind"?: string,"unit_price_cents"?: number,"weight"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_items_dish_id_fkey"
      columns: ["dish_id"]
isOneToOne: false
      referencedRelation: "dishes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "acknowledged_at": string | null,"address": string | null,"anonymised_at": string | null,"created_at": string,"customer_email": string | null,"customer_name": string,"customer_phone": string | null,"delivery_fee_cents": number,"discount_cents": number,"district_id": number | null,"district_name": string | null,"fulfilment": string,"hold_expires_at": string | null,"id": number,"locale": string,"menu_date": string,"notes": string | null,"number": string,"owner_notified_at": string | null,"payment_method": string,"payment_status": string,"reason": string | null,"refunded_cents": number,"reminder_sent_at": string | null,"requested_time": string,"status": string,"status_changed_at": string,"stock_held": boolean,"subtotal_cents": number,"total_cents": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "acknowledged_at"?: string | null,"address"?: string | null,"anonymised_at"?: string | null,"created_at"?: string,"customer_email"?: string | null,"customer_name": string,"customer_phone"?: string | null,"delivery_fee_cents"?: number,"discount_cents"?: number,"district_id"?: number | null,"district_name"?: string | null,"fulfilment": string,"hold_expires_at"?: string | null,"id"?: never,"locale"?: string,"menu_date": string,"notes"?: string | null,"number": string,"owner_notified_at"?: string | null,"payment_method": string,"payment_status": string,"reason"?: string | null,"refunded_cents"?: number,"reminder_sent_at"?: string | null,"requested_time": string,"status": string,"status_changed_at"?: string,"stock_held"?: boolean,"subtotal_cents": number,"total_cents": number,"updated_at"?: string
                  }
                  Update: {
                    "acknowledged_at"?: string | null,"address"?: string | null,"anonymised_at"?: string | null,"created_at"?: string,"customer_email"?: string | null,"customer_name"?: string,"customer_phone"?: string | null,"delivery_fee_cents"?: number,"discount_cents"?: number,"district_id"?: number | null,"district_name"?: string | null,"fulfilment"?: string,"hold_expires_at"?: string | null,"id"?: never,"locale"?: string,"menu_date"?: string,"notes"?: string | null,"number"?: string,"owner_notified_at"?: string | null,"payment_method"?: string,"payment_status"?: string,"reason"?: string | null,"refunded_cents"?: number,"reminder_sent_at"?: string | null,"requested_time"?: string,"status"?: string,"status_changed_at"?: string,"stock_held"?: boolean,"subtotal_cents"?: number,"total_cents"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_district_id_fkey"
      columns: ["district_id"]
isOneToOne: false
      referencedRelation: "districts"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount_cents": number,"authorised_at": string | null,"cancelled_at": string | null,"captured_at": string | null,"checkout_url": string | null,"created_at": string,"failure_message": string | null,"id": number,"order_id": number,"provider": string,"status": string,"stripe_checkout_session_id": string | null,"stripe_payment_intent_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"authorised_at"?: string | null,"cancelled_at"?: string | null,"captured_at"?: string | null,"checkout_url"?: string | null,"created_at"?: string,"failure_message"?: string | null,"id"?: never,"order_id": number,"provider": string,"status": string,"stripe_checkout_session_id"?: string | null,"stripe_payment_intent_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "amount_cents"?: number,"authorised_at"?: string | null,"cancelled_at"?: string | null,"captured_at"?: string | null,"checkout_url"?: string | null,"created_at"?: string,"failure_message"?: string | null,"id"?: never,"order_id"?: number,"provider"?: string,"status"?: string,"stripe_checkout_session_id"?: string | null,"stripe_payment_intent_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_order_id_fkey"
      columns: ["order_id"]
isOneToOne: true
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"rate_limit_hits": {
                  Row: {
                    "bucket": string,"created_at": string,"id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket": string,"created_at"?: string,"id"?: never
                  }
                  Update: {
                    "bucket"?: string,"created_at"?: string,"id"?: never
                  }
                  Relationships: [
                    
                  ]
                },"refunds": {
                  Row: {
                    "amount_cents": number,"confirmed_at": string | null,"created_at": string,"failure_reason": string | null,"id": number,"idempotency_key": string,"order_id": number,"payment_id": number,"reason": string,"requested_by": string | null,"status": string,"stripe_refund_id": string | null,"stripe_status": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"confirmed_at"?: string | null,"created_at"?: string,"failure_reason"?: string | null,"id"?: never,"idempotency_key": string,"order_id": number,"payment_id": number,"reason": string,"requested_by"?: string | null,"status"?: string,"stripe_refund_id"?: string | null,"stripe_status"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "amount_cents"?: number,"confirmed_at"?: string | null,"created_at"?: string,"failure_reason"?: string | null,"id"?: never,"idempotency_key"?: string,"order_id"?: number,"payment_id"?: number,"reason"?: string,"requested_by"?: string | null,"status"?: string,"stripe_refund_id"?: string | null,"stripe_status"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "refunds_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "refunds_payment_id_fkey"
      columns: ["payment_id"]
isOneToOne: false
      referencedRelation: "payments"
      referencedColumns: ["id"]
    }
                  ]
                },"settings": {
                  Row: {
                    "card_payments_enabled": boolean,"delivery_estimate_minutes": number,"free_delivery_from_cents": number | null,"hours_confirmed_at": string | null,"id": number,"min_subtotal_cents": number,"ordering_paused": boolean,"owner_notification_email": string | null,"pause_message_bg": string | null,"pause_message_en": string | null,"pickup_discount_bps": number,"pickup_estimate_minutes": number,"reply_to_email": string | null,"turnstile_enabled": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "card_payments_enabled"?: boolean,"delivery_estimate_minutes"?: number,"free_delivery_from_cents"?: number | null,"hours_confirmed_at"?: string | null,"id"?: number,"min_subtotal_cents"?: number,"ordering_paused"?: boolean,"owner_notification_email"?: string | null,"pause_message_bg"?: string | null,"pause_message_en"?: string | null,"pickup_discount_bps"?: number,"pickup_estimate_minutes"?: number,"reply_to_email"?: string | null,"turnstile_enabled"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "card_payments_enabled"?: boolean,"delivery_estimate_minutes"?: number,"free_delivery_from_cents"?: number | null,"hours_confirmed_at"?: string | null,"id"?: number,"min_subtotal_cents"?: number,"ordering_paused"?: boolean,"owner_notification_email"?: string | null,"pause_message_bg"?: string | null,"pause_message_en"?: string | null,"pickup_discount_bps"?: number,"pickup_estimate_minutes"?: number,"reply_to_email"?: string | null,"turnstile_enabled"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"standing_stock": {
                  Row: {
                    "dish_id": number,"menu_date": string,"reserved": number,"sold_out": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "dish_id": number,"menu_date": string,"reserved"?: number,"sold_out"?: boolean
                  }
                  Update: {
                    "dish_id"?: number,"menu_date"?: string,"reserved"?: number,"sold_out"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "standing_stock_dish_id_fkey"
      columns: ["dish_id"]
isOneToOne: false
      referencedRelation: "dishes"
      referencedColumns: ["id"]
    }
                  ]
                },"stripe_events": {
                  Row: {
                    "error": string | null,"id": string,"processed_at": string | null,"received_at": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "error"?: string | null,"id": string,"processed_at"?: string | null,"received_at"?: string,"type": string
                  }
                  Update: {
                    "error"?: string | null,"id"?: string,"processed_at"?: string | null,"received_at"?: string,"type"?: string
                  }
                  Relationships: [
                    
                  ]
                },"weekday_templates": {
                  Row: {
                    "default_portions": number,"dish_id": number,"sort_order": number,"weekday": number
                  }
                  ComputedFields: never
                  Insert: {
                    "default_portions"?: number,"dish_id": number,"sort_order"?: number,"weekday": number
                  }
                  Update: {
                    "default_portions"?: number,"dish_id"?: number,"sort_order"?: number,"weekday"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "weekday_templates_dish_id_fkey"
      columns: ["dish_id"]
isOneToOne: false
      referencedRelation: "dishes"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "anonymise_old_orders":
{ Args: { "p_older_than"?: string }; Returns: number
                           },
"apply_refund_result":
{ Args: { "p_failure"?: string,"p_refund_id": number,"p_status": string,"p_stripe_status"?: string }; Returns: boolean
                           },
"copy_menu_day":
{ Args: { "p_actor_id"?: string,"p_dish_ids"?: (number)[],"p_from": string,"p_to": string }; Returns: number
                           },
"expire_stale_holds":
{ Args: { "p_grace_seconds"?: number }; Returns: number
                           },
"hit_rate_limit":
{ Args: { "p_bucket": string,"p_max": number,"p_window_seconds": number }; Returns: boolean
                           },
"place_order":
{ Args: { "p_items": Json,"p_order": Json }; Returns: {
              "order_id": number,"order_number": string
            }[]
                           },
"prefill_week":
{ Args: { "p_actor_id"?: string,"p_monday": string }; Returns: number
                           },
"release_order_stock":
{ Args: { "p_actor"?: string,"p_actor_id"?: string,"p_order_id": number }; Returns: boolean
                           },
"rereserve_order_stock":
{ Args: { "p_order_id": number }; Returns: boolean
                           },
"transition_order":
{ Args: { "p_actor": string,"p_actor_id"?: string,"p_from": string,"p_order_id": number,"p_payment_status"?: string,"p_reason"?: string,"p_release_stock"?: boolean,"p_to": string }; Returns: boolean
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
