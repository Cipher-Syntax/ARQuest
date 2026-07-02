# ARQuest — Conceptual ERD Model (Chen's Notation)

> Last updated: 2026-06-22

This document illustrates the database schema using classic **Chen's Entity-Relationship notation**, where:
- **Rectangles** represent Entities (Tables)
- **Ovals** represent Attributes (Columns)
- **Diamonds** represent Relationships between Entities

To prevent the diagram from becoming an unreadable web, the models are grouped logically by domain.

---

## 1. Authentication Domain

```mermaid
flowchart TD
    %% Entities (Rectangles)
    USER["USER"]
    EMAIL_OTP["EMAIL_OTP"]

    %% Relationships (Diamonds)
    verifies{"verifies email via"}

    %% Attributes for USER (Ovals)
    u_id(["id (PK)"])
    u_user(["username"])
    u_pass(["password"])
    u_email(["email"])
    u_role(["role"])
    u_pts(["exploration_points"])
    u_ver(["email_verified"])
    u_act(["is_active"])
    u_av(["avatar_id"])
    u_strk(["streak_count"])
    u_ld(["last_login_date"])
    
    USER --- u_id
    USER --- u_user
    USER --- u_pass
    USER --- u_email
    USER --- u_role
    USER --- u_pts
    USER --- u_ver
    USER --- u_act
    USER --- u_av
    USER --- u_strk
    USER --- u_ld

    %% Attributes for EMAIL_OTP (Ovals)
    o_id(["id (PK)"])
    o_email(["email"])
    o_otp(["otp"])
    o_exp(["expires_at"])
    o_used(["is_used"])
    
    EMAIL_OTP --- o_id
    EMAIL_OTP --- o_email
    EMAIL_OTP --- o_otp
    EMAIL_OTP --- o_exp
    EMAIL_OTP --- o_used

    %% Connections
    USER --- verifies
    verifies --- EMAIL_OTP
```

---

## 2. Buildings & Geofencing Domain

```mermaid
flowchart TD
    %% Entities
    DEPT["DEPARTMENT"]
    BLDG["BUILDING"]
    GEO["GEOFENCE"]
    UNLOCK["BUILDING_UNLOCK"]
    ASSET["BUILDING_ASSET"]

    %% Relationships
    primary{"primary for"}
    boundary{"has boundary"}
    access{"unlocked via"}
    holds{"stores assets"}

    %% Attributes - Dept
    d_id(["id (PK)"])
    d_name(["name"])
    d_code(["code"])
    d_col(["color_hex"])
    
    DEPT --- d_id
    DEPT --- d_name
    DEPT --- d_code
    DEPT --- d_col

    %% Attributes - Bldg
    b_id(["id (PK)"])
    b_name(["name"])
    b_slug(["slug"])
    b_stat(["status"])
    b_lat(["latitude"])
    b_lng(["longitude"])
    b_qr(["qr_code_secret"])
    
    BLDG --- b_id
    BLDG --- b_name
    BLDG --- b_slug
    BLDG --- b_stat
    BLDG --- b_lat
    BLDG --- b_lng
    BLDG --- b_qr

    %% Attributes - Geofence
    g_id(["id (PK)"])
    g_lat(["latitude"])
    g_lng(["longitude"])
    g_rad(["radius_meters"])
    
    GEO --- g_id
    GEO --- g_lat
    GEO --- g_lng
    GEO --- g_rad

    %% Attributes - Unlock
    u_id(["id (PK)"])
    u_src(["source"])
    u_at(["unlocked_at"])
    
    UNLOCK --- u_id
    UNLOCK --- u_src
    UNLOCK --- u_at

    %% Attributes - Asset
    a_id(["id (PK)"])
    a_type(["asset_type"])
    a_ver(["version"])
    a_chk(["checksum"])
    
    ASSET --- a_id
    ASSET --- a_type
    ASSET --- a_ver
    ASSET --- a_chk

    %% Structure
    DEPT --- primary --- BLDG
    BLDG --- boundary --- GEO
    BLDG --- access --- UNLOCK
    BLDG --- holds --- ASSET
```

---

## 3. Gamification Domain (Quests & Trivia)

```mermaid
flowchart TD
    %% External Entity Ref
    USER["USER"]
    BLDG["BUILDING"]

    %% Entities
    QUEST["QUEST"]
    PROG["USER_QUEST_PROGRESS"]
    TRIVIA["TRIVIA_FACT"]

    %% Relationships
    target{"is target of"}
    hosts{"has trivia"}
    makes{"makes progress"}
    tracks{"tracks quest"}

    %% Attributes - Quest
    q_id(["id (PK)"])
    q_title(["title"])
    q_hint(["hint"])
    q_pts(["reward_points"])

    QUEST --- q_id
    QUEST --- q_title
    QUEST --- q_hint
    QUEST --- q_pts

    %% Attributes - Progress
    p_id(["id (PK)"])
    p_comp(["is_completed"])
    p_at(["completed_at"])

    PROG --- p_id
    PROG --- p_comp
    PROG --- p_at

    %% Attributes - Trivia
    t_id(["id (PK)"])
    t_fact(["fact"])
    t_act(["is_active"])

    TRIVIA --- t_id
    TRIVIA --- t_fact
    TRIVIA --- t_act

    %% Structure
    BLDG --- target --- QUEST
    BLDG --- hosts --- TRIVIA
    USER --- makes --- PROG
    PROG --- tracks --- QUEST
```

---

## 4. Panorama Walkthrough Domain

```mermaid
flowchart TD
    %% External Entity Ref
    BLDG["BUILDING"]

    %% Entities
    SCENE["PANORAMA_SCENE"]
    HOTSPOT["PANORAMA_HOTSPOT"]

    %% Relationships
    contains{"contains scenes"}
    source{"is source of"}
    target{"is target of"}

    %% Attributes - Scene
    s_id(["id (PK)"])
    s_title(["title"])
    s_img(["image"])
    s_start(["is_start_scene"])
    s_sort(["sort_order"])

    SCENE --- s_id
    SCENE --- s_title
    SCENE --- s_img
    SCENE --- s_start
    SCENE --- s_sort

    %% Attributes - Hotspot
    h_id(["id (PK)"])
    h_yaw(["yaw"])
    h_pitch(["pitch"])
    h_lbl(["label"])

    HOTSPOT --- h_id
    HOTSPOT --- h_yaw
    HOTSPOT --- h_pitch
    HOTSPOT --- h_lbl

    %% Structure
    BLDG --- contains --- SCENE
    SCENE --- source --- HOTSPOT
    HOTSPOT --- target --- SCENE
```

---

## 5. API & System Setting Domain

```mermaid
flowchart TD
    %% Entities
    SYS["SYSTEM_SETTING"]

    %% Attributes
    s_id(["id (Always 1)"])
    s_app(["app_name"])
    s_maint(["maintenance_mode"])
    s_gps(["enable_gps"])
    s_qr(["enable_qr"])
    s_ar(["enable_ar_selfie"])
    s_triv(["enable_trivia"])
    s_acc(["enable_accreditation"])
    s_lead(["enable_leaderboard"])
    s_pts(["default_quest_reward"])

    SYS --- s_id
    SYS --- s_app
    SYS --- s_maint
    SYS --- s_gps
    SYS --- s_qr
    SYS --- s_ar
    SYS --- s_triv
    SYS --- s_acc
    SYS --- s_lead
    SYS --- s_pts
```
