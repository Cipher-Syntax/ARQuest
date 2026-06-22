# ARQuest — ERD Model

> Last updated: 2026-06-22

This document provides the visual structural models for all Django applications in ARQuest.

## 1. Authentication App Model

```mermaid
erDiagram
    USER {
        int id PK "AutoIncrement"
        string username UK "NOT NULL"
        string password "NOT NULL"
        string email UK "NOT NULL"
        string first_name "Optional"
        string last_name "Optional"
        string role "admin | student | professional | visitor"
        boolean email_verified "Default: False"
        int exploration_points "Default: 0"
        boolean is_active "Default: True"
        boolean is_staff "Default: False"
        boolean is_superuser "Default: False"
        datetime date_joined "AutoNowAdd"
        datetime last_login "Optional"
    }

    EMAIL_OTP {
        int id PK "AutoIncrement"
        string email "NOT NULL, Indexed"
        string otp "6-digit code"
        datetime created_at "AutoNowAdd"
        datetime expires_at "created_at + 10 mins"
        boolean is_used "Default: False"
    }

    USER ||--o{ EMAIL_OTP : "verifies email via"
```

## 2. Buildings & Gamification App Model

```mermaid
erDiagram
    DEPARTMENT {
        int id PK "AutoIncrement"
        string name "NOT NULL"
        string code UK "Slug"
        text description "Optional"
        string color_hex "NOT NULL (e.g., #FF0000)"
        boolean is_active "Default: True"
        datetime created_at "AutoNowAdd"
        datetime updated_at "AutoNow"
    }

    BUILDING {
        int id PK "AutoIncrement"
        int primary_department_id FK "SET_NULL"
        string name "NOT NULL"
        string slug UK "Required if VISIBLE"
        text description "Optional"
        decimal latitude "Optional"
        decimal longitude "Optional"
        string status "DRAFT | HIDDEN | VISIBLE"
        boolean is_active "Default: True"
        file model_file "Optional (.glb)"
        string model_version "Optional"
        int model_file_size "Optional"
        boolean model_active "Default: False"
        uuid qr_code_secret UK "Auto"
        datetime created_at "AutoNowAdd"
        datetime updated_at "AutoNow"
        datetime deleted_at "Soft Delete"
    }

    GEOFENCE {
        int id PK "AutoIncrement"
        int building_id FK "CASCADE"
        decimal latitude "NOT NULL"
        decimal longitude "NOT NULL"
        decimal radius_meters "NOT NULL"
        boolean is_active "Default: True"
        datetime created_at "AutoNowAdd"
        datetime updated_at "AutoNow"
    }

    BUILDING_UNLOCK {
        int id PK "AutoIncrement"
        int user_id FK "CASCADE"
        int building_id FK "CASCADE"
        string source "geofence | admin | role | qr"
        datetime unlocked_at "AutoNowAdd"
        datetime last_validated_at "AutoNow"
    }

    BUILDING_ASSET {
        int id PK "AutoIncrement"
        int building_id FK "CASCADE"
        string asset_type "model | panorama | image"
        file file "NOT NULL"
        int version "Default: 1"
        int file_size "NOT NULL"
        string checksum "SHA256"
        boolean is_active "Default: True"
        datetime created_at "AutoNowAdd"
        datetime updated_at "AutoNow"
    }

    QUEST {
        int id PK "AutoIncrement"
        int target_building_id FK "CASCADE"
        string title "NOT NULL"
        text hint "NOT NULL"
        int reward_points "NOT NULL"
        boolean is_active "Default: True"
        datetime created_at "AutoNowAdd"
        datetime deleted_at "Soft Delete"
    }

    USER_QUEST_PROGRESS {
        int id PK "AutoIncrement"
        int user_id FK "CASCADE"
        int quest_id FK "CASCADE"
        boolean is_completed "Default: False"
        datetime completed_at "Optional"
    }

    TRIVIA_FACT {
        int id PK "AutoIncrement"
        int building_id FK "CASCADE"
        text fact "NOT NULL"
        boolean is_active "Default: True"
        datetime created_at "AutoNowAdd"
        datetime updated_at "AutoNow"
        datetime deleted_at "Soft Delete"
    }

    DEPARTMENT ||--o{ BUILDING : "primary_department"
    BUILDING ||--o{ GEOFENCE : "has"
    BUILDING ||--o{ BUILDING_UNLOCK : "unlocked via"
    BUILDING ||--o{ BUILDING_ASSET : "has assets"
    BUILDING ||--o{ QUEST : "target of"
    BUILDING ||--o{ TRIVIA_FACT : "has trivia"
    QUEST ||--o{ USER_QUEST_PROGRESS : "tracks progress"
```

## 3. Panorama Walkthrough App Model

```mermaid
erDiagram
    PANORAMA_SCENE {
        int id PK "AutoIncrement"
        int building_id FK "CASCADE"
        string title "NOT NULL"
        image image "NOT NULL"
        int sort_order "Default: 0"
        boolean is_start_scene "Default: False"
        boolean is_active "Default: True"
        datetime created_at "AutoNowAdd"
        datetime updated_at "AutoNow"
    }

    PANORAMA_HOTSPOT {
        int id PK "AutoIncrement"
        int source_scene_id FK "CASCADE"
        int target_scene_id FK "CASCADE"
        string label "Optional"
        float yaw "NOT NULL"
        float pitch "NOT NULL"
        boolean is_active "Default: True"
    }

    PANORAMA_SCENE ||--o{ PANORAMA_HOTSPOT : "is source of"
    PANORAMA_SCENE ||--o{ PANORAMA_HOTSPOT : "is target of"
```

## 4. API & System Setting Model

```mermaid
erDiagram
    SYSTEM_SETTING {
        int id PK "Always 1"
        string app_name "Default: ARQuest"
        boolean maintenance_mode "Default: False"
        string contact_email "Optional"
        boolean enable_gps "Default: True"
        boolean enable_qr "Default: True"
        boolean enable_ar_selfie "Default: True"
        boolean enable_trivia "Default: True"
        boolean enable_accreditation "Default: True"
        boolean enable_leaderboard "Default: True"
        int default_quest_reward "Default: 50"
    }
```
