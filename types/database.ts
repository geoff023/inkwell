// Hand-written mirror of supabase/migrations. After schema changes, run
// `npm run db:types` against a local database and reconcile with this file.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Rel<Name extends string, Column extends string, Target extends string> = {
  foreignKeyName: Name;
  columns: [Column];
  isOneToOne: false;
  referencedRelation: Target;
  referencedColumns: ["id"];
};

export type Database = {
  __InternalSupabase: { PostgrestVersion: "13" };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          bio: string | null;
          avatar_url: string | null;
          interests: string[];
          onboarded: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: {
          username?: string;
          display_name?: string;
          bio?: string | null;
          avatar_url?: string | null;
          interests?: string[];
          onboarded?: boolean;
        };
        Relationships: [];
      };
      entries: {
        Row: {
          id: string;
          author_id: string;
          title: string | null;
          content_json: Json;
          content_text: string;
          visibility: Database["public"]["Enums"]["entry_visibility"];
          status: Database["public"]["Enums"]["entry_status"];
          revision: number;
          created_at: string;
          updated_at: string;
          published_at: string | null;
        };
        Insert: {
          id?: string;
          author_id?: string;
          title?: string | null;
          content_json?: Json;
          content_text?: string;
        };
        Update: {
          title?: string | null;
          content_json?: Json;
          content_text?: string;
          visibility?: Database["public"]["Enums"]["entry_visibility"];
          status?: Database["public"]["Enums"]["entry_status"];
        };
        Relationships: [Rel<"entries_author_id_fkey", "author_id", "profiles">];
      };
      tags: {
        Row: { id: string; name: string; slug: string; created_at: string };
        Insert: { id?: string; name: string; slug: string };
        Update: never;
        Relationships: [];
      };
      entry_tags: {
        Row: { entry_id: string; tag_id: string };
        Insert: { entry_id: string; tag_id: string };
        Update: never;
        Relationships: [Rel<"entry_tags_entry_id_fkey", "entry_id", "entries">, Rel<"entry_tags_tag_id_fkey", "tag_id", "tags">];
      };
      likes: {
        Row: { user_id: string; entry_id: string; created_at: string };
        Insert: { entry_id: string; user_id?: string };
        Update: never;
        Relationships: [Rel<"likes_user_id_fkey", "user_id", "profiles">, Rel<"likes_entry_id_fkey", "entry_id", "entries">];
      };
      bookmarks: {
        Row: { user_id: string; entry_id: string; created_at: string };
        Insert: { entry_id: string; user_id?: string };
        Update: never;
        Relationships: [Rel<"bookmarks_user_id_fkey", "user_id", "profiles">, Rel<"bookmarks_entry_id_fkey", "entry_id", "entries">];
      };
      comments: {
        Row: { id: string; entry_id: string; author_id: string; content: string; created_at: string; updated_at: string };
        Insert: { entry_id: string; content: string; author_id?: string };
        Update: { content?: string };
        Relationships: [Rel<"comments_author_id_fkey", "author_id", "profiles">, Rel<"comments_entry_id_fkey", "entry_id", "entries">];
      };
      follows: {
        Row: { follower_id: string; following_id: string; created_at: string };
        Insert: { following_id: string; follower_id?: string };
        Update: never;
        Relationships: [
          Rel<"follows_follower_id_fkey", "follower_id", "profiles">,
          Rel<"follows_following_id_fkey", "following_id", "profiles">,
        ];
      };
      blocks: {
        Row: { blocker_id: string; blocked_id: string; created_at: string };
        Insert: { blocked_id: string; blocker_id?: string };
        Update: never;
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          entry_id: string | null;
          comment_id: string | null;
          profile_id: string | null;
          reason: Database["public"]["Enums"]["report_reason"];
          details: string | null;
          status: Database["public"]["Enums"]["report_status"];
          created_at: string;
        };
        Insert: {
          entry_id?: string | null;
          comment_id?: string | null;
          profile_id?: string | null;
          reason: Database["public"]["Enums"]["report_reason"];
          details?: string | null;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      search_my_entries: {
        Args: { q: string; max_rows?: number };
        Returns: Database["public"]["Tables"]["entries"]["Row"][];
        SetofOptions: { from: "*"; to: "entries"; isOneToOne: false; isSetofReturn: true };
      };
      delete_my_account: { Args: never; Returns: undefined };
      is_blocked_between: { Args: { a: string; b: string }; Returns: boolean };
      is_public_entry: { Args: { target: string }; Returns: boolean };
    };
    Enums: {
      entry_visibility: "private" | "public" | "selected";
      entry_status: "draft" | "published" | "unpublished";
      report_reason: "spam" | "harassment" | "hate" | "self_harm" | "sexual" | "other";
      report_status: "open" | "reviewed" | "dismissed";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicTables = Database["public"]["Tables"];
export type Tables<T extends keyof PublicTables> = PublicTables[T]["Row"];
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T];

export type Profile = Tables<"profiles">;
export type Entry = Tables<"entries">;
export type Comment = Tables<"comments">;
export type EntryStatus = Enums<"entry_status">;
export type EntryVisibility = Enums<"entry_visibility">;
export type ReportReason = Enums<"report_reason">;
