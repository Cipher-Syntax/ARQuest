# ARQuest System Architecture

```mermaid
graph TD
    subgraph Mobile App "Mobile Application (React Native / Expo)"
        UI[User Interface]
        AuthC[Auth Context]
        API_S[API Service]
        AR[AR Engine]
    end

    subgraph Backend "Backend System (Django)"
        API_G[API Gateway / URLs]
        Auth_A[Authentication App]
        Bldg_A[Buildings App]
        Admin[Django Admin Panel]
    end

    subgraph Database "Database Layer"
        DB[(Relational Database)]
    end

    UI --> AuthC
    UI --> API_S
    UI --> AR
    AuthC --> API_S
    API_S -->|HTTP/REST| API_G
    API_G --> Auth_A
    API_G --> Bldg_A
    Auth_A --> DB
    Bldg_A --> DB
    Admin --> Auth_A
    Admin --> Bldg_A
```
