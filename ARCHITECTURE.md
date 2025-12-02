# Radio Calico - System Architecture

This document provides a comprehensive overview of the Radio Calico system architecture.

## Table of Contents

- [High-Level Architecture](#high-level-architecture)
- [Application Architecture](#application-architecture)
- [Database Schema](#database-schema)
- [Frontend Architecture](#frontend-architecture)
- [Docker Architecture](#docker-architecture)
- [CI/CD Pipeline](#cicd-pipeline)
- [Data Flow](#data-flow)
- [Deployment Architecture](#deployment-architecture)

---

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Web Browser]
        Mobile[Mobile Browser]
    end

    subgraph "CDN Layer"
        CDN[CloudFront CDN]
        Stream[HLS Stream<br/>live.m3u8]
        Metadata[Metadata API<br/>metadatav2.json]
        Artwork[Album Art<br/>cover.jpg]
    end

    subgraph "Application Layer"
        LB[Load Balancer<br/>Optional]
        App1[Radio Calico<br/>App Instance 1]
        App2[Radio Calico<br/>App Instance 2]
        App3[Radio Calico<br/>App Instance N]
    end

    subgraph "Data Layer"
        DB[(PostgreSQL 16<br/>Database)]
        DBReplica[(PostgreSQL<br/>Read Replica<br/>Optional)]
    end

    Browser --> LB
    Mobile --> LB
    Browser --> CDN
    Mobile --> CDN

    CDN --> Stream
    CDN --> Metadata
    CDN --> Artwork

    LB --> App1
    LB --> App2
    LB --> App3

    App1 --> DB
    App2 --> DB
    App3 --> DB

    App1 -.-> DBReplica
    App2 -.-> DBReplica
    App3 -.-> DBReplica

    DB --> DBReplica

    style Browser fill:#e1f5ff
    style Mobile fill:#e1f5ff
    style CDN fill:#fff4e6
    style LB fill:#f3e5f5
    style App1 fill:#e8f5e9
    style App2 fill:#e8f5e9
    style App3 fill:#e8f5e9
    style DB fill:#fce4ec
    style DBReplica fill:#fce4ec
```

---

## Application Architecture

```mermaid
graph TB
    subgraph "Radio Calico Application"
        subgraph "Frontend - Single Page App"
            HTML[index.html<br/>Structure]
            CSS[styles.css<br/>Presentation]
            AppModule[app.module.js<br/>Core Logic]
            AppJS[app.js<br/>Orchestration]

            HTML --> AppJS
            CSS --> HTML
            AppModule --> AppJS
        end

        subgraph "Frontend Modules"
            Fingerprint[Fingerprinting<br/>Module]
            Rating[Rating<br/>Module]
            Metadata[Metadata<br/>Module]
            UI[UI<br/>Module]
            Audio[Audio Player<br/>Module]
            Validation[Validation<br/>Module]

            AppModule --> Fingerprint
            AppModule --> Rating
            AppModule --> Metadata
            AppModule --> UI
            AppModule --> Audio
            AppModule --> Validation
        end

        subgraph "Backend - Express.js"
            Server[server.js<br/>Express Server]
            Routes[API Routes]
            Pool[PostgreSQL<br/>Connection Pool]

            Server --> Routes
            Server --> Pool
        end

        subgraph "API Endpoints"
            HealthAPI[GET /api/health]
            StatusAPI[GET /api]
            RatingsPostAPI[POST /api/ratings]
            RatingsGetAPI[GET /api/ratings/:artist/:title]
            UserRatingAPI[GET /api/ratings/:artist/:title/user/:fingerprint]
            ClientIPAPI[GET /api/client-ip]

            Routes --> HealthAPI
            Routes --> StatusAPI
            Routes --> RatingsPostAPI
            Routes --> RatingsGetAPI
            Routes --> UserRatingAPI
            Routes --> ClientIPAPI
        end

        AppJS --> Routes
        Routes --> Pool
    end

    subgraph "External Services"
        HLSCDN[HLS Stream CDN<br/>CloudFront]
        MetadataAPI[Metadata API<br/>metadatav2.json]
        ArtworkCDN[Album Art CDN<br/>cover.jpg]
        HLSLib[HLS.js Library<br/>unpkg.com]
    end

    Audio --> HLSCDN
    Metadata --> MetadataAPI
    UI --> ArtworkCDN
    HTML --> HLSLib

    subgraph "Database"
        DB[(PostgreSQL 16<br/>prototype_db)]
        SongRatings[song_ratings<br/>table]

        DB --> SongRatings
        Pool --> DB
    end

    style HTML fill:#e1f5ff
    style CSS fill:#e1f5ff
    style AppModule fill:#e8f5e9
    style AppJS fill:#e8f5e9
    style Server fill:#fff4e6
    style Routes fill:#fff4e6
    style DB fill:#fce4ec
    style HLSCDN fill:#f3e5f5
    style MetadataAPI fill:#f3e5f5
    style ArtworkCDN fill:#f3e5f5
```

---

## Database Schema

```mermaid
erDiagram
    song_ratings {
        integer id PK "Primary Key, Auto-increment"
        text artist "Artist name, NOT NULL"
        text title "Song title, NOT NULL"
        smallint rating "Rating value (1 or -1), NOT NULL"
        text user_fingerprint "Unique user ID, NOT NULL"
        timestamp created_at "Creation timestamp, DEFAULT NOW()"
    }

    song_ratings ||--o{ UNIQUE_CONSTRAINT : has
    song_ratings ||--o{ INDEX_ARTIST_TITLE : has
    song_ratings ||--o{ INDEX_USER_FINGERPRINT : has
    song_ratings ||--o{ INDEX_CREATED_AT : has

    UNIQUE_CONSTRAINT {
        text constraint_name "unique_user_song_rating"
        text columns "artist, title, user_fingerprint"
    }

    INDEX_ARTIST_TITLE {
        text index_name "idx_song_ratings_artist_title"
        text columns "artist, title"
    }

    INDEX_USER_FINGERPRINT {
        text index_name "idx_song_ratings_user_fingerprint"
        text columns "user_fingerprint"
    }

    INDEX_CREATED_AT {
        text index_name "idx_song_ratings_created_at"
        text columns "created_at"
    }
```

**Database Details:**
- **Primary Key:** Auto-incrementing `id`
- **Unique Constraint:** Prevents duplicate ratings (same user, same song)
- **Indexes:** Optimized for queries by artist/title, user fingerprint, and creation time
- **Rating Values:** `1` (thumbs up) or `-1` (thumbs down)
- **Upsert Support:** Allows users to change their rating

---

## Frontend Architecture

```mermaid
graph LR
    subgraph "Browser Environment"
        subgraph "User Interface"
            Player[Audio Player<br/>Controls]
            NowPlaying[Now Playing<br/>Display]
            RecentTracks[Recently Played<br/>List]
            RatingButtons[Rating Buttons<br/>Thumbs Up/Down]
            Volume[Volume Control]
            ElapsedTime[Elapsed Time<br/>Display]
        end

        subgraph "Application State"
            CurrentTrack[currentTrack<br/>{artist, title}]
            UserFP[userFingerprint]
            HLSInstance[HLS.js Instance]
            Timers[Timers & Intervals]
            AudioElement[Audio Element]
        end

        subgraph "Core Modules - app.module.js"
            FPModule[Fingerprinting<br/>- Canvas FP<br/>- WebGL FP<br/>- Audio FP<br/>- Browser Features<br/>- IP Address]

            MetadataModule[Metadata<br/>- Fetch metadata<br/>- Update display<br/>- Track history<br/>- Album art]

            RatingModule[Rating<br/>- Submit rating<br/>- Get counts<br/>- User rating<br/>- Update UI]

            UIModule[UI Controls<br/>- Play/Pause<br/>- Volume<br/>- Display updates<br/>- Error handling]

            AudioModule[Audio Player<br/>- HLS.js setup<br/>- Stream loading<br/>- Error recovery<br/>- Safari fallback]

            ValidationModule[Validation<br/>- Input validation<br/>- Data sanitization]
        end

        subgraph "Orchestration - app.js"
            Init[Initialization<br/>- Get fingerprint<br/>- Setup HLS<br/>- Setup UI<br/>- Start polling]

            Polling[Metadata Polling<br/>Every 2 seconds]

            EventHandlers[Event Handlers<br/>- Play/Pause<br/>- Volume change<br/>- Rating clicks]

            StateManagement[State Management<br/>- Track changes<br/>- Timer updates<br/>- Rating sync]
        end

        Player --> AudioElement
        NowPlaying --> CurrentTrack
        RatingButtons --> RatingModule

        Init --> FPModule
        Init --> AudioModule
        Init --> UIModule
        Init --> Polling

        Polling --> MetadataModule
        EventHandlers --> RatingModule
        EventHandlers --> UIModule

        AudioModule --> HLSInstance
        HLSInstance --> AudioElement

        MetadataModule --> StateManagement
        RatingModule --> StateManagement
        StateManagement --> CurrentTrack
    end

    subgraph "External APIs"
        StreamAPI[HLS Stream API]
        MetaAPI[Metadata API<br/>2-second polling]
        ArtAPI[Album Art API]
        BackendAPI[Backend API<br/>Rating endpoints]
    end

    AudioModule --> StreamAPI
    MetadataModule --> MetaAPI
    MetadataModule --> ArtAPI
    RatingModule --> BackendAPI

    style Player fill:#e1f5ff
    style NowPlaying fill:#e1f5ff
    style FPModule fill:#e8f5e9
    style MetadataModule fill:#e8f5e9
    style RatingModule fill:#e8f5e9
    style UIModule fill:#e8f5e9
    style AudioModule fill:#e8f5e9
    style Init fill:#fff4e6
    style Polling fill:#fff4e6
```

---

## Docker Architecture

```mermaid
graph TB
    subgraph "Docker Host"
        subgraph "Production Stack - docker-compose.yml"
            ProdApp[radiocalico-app<br/>Node.js 20 Alpine<br/>Port 3000<br/>Non-root user]
            ProdDB[radiocalico-postgres<br/>PostgreSQL 16 Alpine<br/>Port 5432<br/>Persistent volume]
            ProdNetwork[radiocalico-network<br/>Bridge network]
            ProdVolume[(postgres_data<br/>Volume)]

            ProdApp --> ProdNetwork
            ProdDB --> ProdNetwork
            ProdDB --> ProdVolume
        end

        subgraph "Development Stack - docker-compose.dev.yml"
            DevApp[radiocalico-app-dev<br/>Node.js 20 Alpine<br/>Port 3000, 9229<br/>Hot-reload<br/>Volume mounted]
            DevDB[radiocalico-postgres-dev<br/>PostgreSQL 16 Alpine<br/>Port 5433<br/>Dev volume]
            TestDB[radiocalico-postgres-test<br/>PostgreSQL 16 Alpine<br/>Port 5434<br/>Test volume]
            DevNetwork[radiocalico-dev-network<br/>Bridge network]
            DevVolume[(postgres_dev_data<br/>Volume)]
            TestVolume[(postgres_test_data<br/>Volume)]
            NodeModules[(node_modules<br/>Volume)]

            DevApp --> DevNetwork
            DevDB --> DevNetwork
            TestDB --> DevNetwork
            DevDB --> DevVolume
            TestDB --> TestVolume
            DevApp --> NodeModules
        end

        subgraph "Multi-Stage Production Build"
            BuildStage[Builder Stage<br/>- Install all deps<br/>- Run tests<br/>- Build artifacts]
            ProdStage[Production Stage<br/>- Prod deps only<br/>- Copy artifacts<br/>- Non-root user<br/>- Health checks]

            BuildStage --> ProdStage
        end

        subgraph "Images"
            ProdImage[radiocalico:latest<br/>~150MB<br/>Optimized]
            DevImage[radiocalico:dev<br/>~300MB<br/>Dev tools]

            ProdStage --> ProdImage
            DevImage --> DevApp
            ProdImage --> ProdApp
        end
    end

    subgraph "Host Ports"
        Port3000[Host :3000]
        Port9229[Host :9229<br/>Debug]
        Port5432[Host :5432]
        Port5433[Host :5433]
        Port5434[Host :5434]
    end

    Port3000 --> ProdApp
    Port3000 -.-> DevApp
    Port9229 -.-> DevApp
    Port5432 --> ProdDB
    Port5433 -.-> DevDB
    Port5434 -.-> TestDB

    style ProdApp fill:#e8f5e9
    style DevApp fill:#e1f5ff
    style ProdDB fill:#fce4ec
    style DevDB fill:#fce4ec
    style TestDB fill:#fce4ec
    style ProdImage fill:#fff4e6
    style DevImage fill:#fff4e6
    style BuildStage fill:#f3e5f5
    style ProdStage fill:#f3e5f5
```

---

## CI/CD Pipeline

```mermaid
graph TB
    subgraph "GitHub"
        Push[Push to main]
        PR[Pull Request]
        Schedule[Weekly Schedule<br/>Mondays 9 AM UTC]
    end

    Push --> Trigger
    PR --> Trigger
    Schedule --> TriggerSec

    subgraph "GitHub Actions - CI Workflow"
        Trigger[Workflow Trigger]

        subgraph "Parallel Jobs"
            TestJob[Test Job<br/>- Setup PostgreSQL<br/>- Run 96 tests<br/>- Generate coverage<br/>- Upload to Codecov]

            SecurityJob[Security Job<br/>- npm audit<br/>- Check outdated<br/>- Generate report<br/>- Upload artifact]

            DockerJob[Docker Build Job<br/>- Build production<br/>- Build development<br/>- Validate compose<br/>- Cache layers]

            LintJob[Lint Job<br/>- Syntax check<br/>- Package validation<br/>- Console.log check]
        end

        SummaryJob[Summary Job<br/>- Aggregate results<br/>- Pass/Fail status<br/>- Detailed report]

        Trigger --> TestJob
        Trigger --> SecurityJob
        Trigger --> DockerJob
        Trigger --> LintJob
        TriggerSec --> SecurityJob

        TestJob --> SummaryJob
        SecurityJob --> SummaryJob
        DockerJob --> SummaryJob
        LintJob --> SummaryJob
    end

    subgraph "Test Infrastructure"
        TestDB[(PostgreSQL 16<br/>Test Database<br/>GitHub Service)]
        TestEnv[Test Environment<br/>- TEST_DB_USER<br/>- TEST_DB_PASSWORD<br/>- Node.js 20]

        TestJob --> TestDB
        TestJob --> TestEnv
    end

    subgraph "Artifacts & Reports"
        Coverage[Coverage Report<br/>Codecov]
        SecurityReport[Security Audit<br/>JSON Report<br/>30-day retention]

        TestJob --> Coverage
        SecurityJob --> SecurityReport
    end

    subgraph "Secrets - GitHub"
        Secrets[GitHub Secrets<br/>- TEST_DB_USER<br/>- TEST_DB_PASSWORD<br/>- CODECOV_TOKEN<br/>- CLAUDE_CODE_OAUTH_TOKEN]

        TestJob -.-> Secrets
        SecurityJob -.-> Secrets
    end

    SummaryJob --> Success[✅ Success<br/>Merge allowed]
    SummaryJob --> Failure[❌ Failure<br/>Merge blocked]

    style Push fill:#e1f5ff
    style PR fill:#e1f5ff
    style TestJob fill:#e8f5e9
    style SecurityJob fill:#fff4e6
    style DockerJob fill:#f3e5f5
    style LintJob fill:#fce4ec
    style Success fill:#c8e6c9
    style Failure fill:#ffcdd2
    style Secrets fill:#fff9c4
```

---

## Data Flow

### Rating Submission Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant Fingerprint
    participant Frontend
    participant Backend
    participant Database

    User->>Browser: Click thumbs up/down
    Browser->>Fingerprint: Get user fingerprint
    Fingerprint->>Fingerprint: Generate if not exists<br/>Canvas + WebGL + Audio + Browser + IP
    Fingerprint-->>Browser: Return fingerprint
    Browser->>Frontend: Validate input<br/>(artist, title, rating)
    Frontend->>Backend: POST /api/ratings<br/>{artist, title, rating, userFingerprint}
    Backend->>Backend: Validate data
    Backend->>Database: UPSERT rating<br/>ON CONFLICT UPDATE
    Database-->>Backend: Success
    Backend-->>Frontend: 200 OK {message}
    Frontend->>Frontend: Update button states
    Frontend->>Backend: GET /api/ratings/:artist/:title
    Backend->>Database: SELECT aggregated counts
    Database-->>Backend: {thumbsUp, thumbsDown}
    Backend-->>Frontend: Rating counts
    Frontend->>Frontend: Update display
    Frontend-->>User: Show updated ratings
```

### Metadata Polling Flow

```mermaid
sequenceDiagram
    participant Timer
    participant Frontend
    participant MetadataAPI
    participant AlbumArtCDN
    participant State
    participant UI

    Timer->>Frontend: Every 2 seconds
    Frontend->>MetadataAPI: GET metadatav2.json
    MetadataAPI-->>Frontend: {artist, title, bitrate, ...}
    Frontend->>State: Check if track changed

    alt Track Changed
        State->>Frontend: New track detected
        Frontend->>AlbumArtCDN: GET cover.jpg
        AlbumArtCDN-->>Frontend: Album artwork
        Frontend->>UI: Update now playing
        Frontend->>UI: Update album art
        Frontend->>UI: Reset elapsed timer
        Frontend->>UI: Update recently played list
        Frontend->>Frontend: Fetch rating counts
    else Same Track
        State->>Frontend: Track unchanged
        Frontend->>UI: Continue elapsed timer
    end
```

### Audio Streaming Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant HLSjs
    participant CDN
    participant AudioElement

    User->>Browser: Click play button
    Browser->>HLSjs: Initialize HLS.js
    HLSjs->>CDN: Request live.m3u8
    CDN-->>HLSjs: Master playlist
    HLSjs->>CDN: Request media playlist
    CDN-->>HLSjs: Media segments list

    loop Continuous Streaming
        HLSjs->>CDN: Request .ts segment
        CDN-->>HLSjs: FLAC audio segment
        HLSjs->>AudioElement: Append to buffer
        AudioElement->>User: Play audio
    end

    alt Error Occurs
        HLSjs->>HLSjs: Detect error
        HLSjs->>Browser: Trigger error handler
        Browser->>HLSjs: Attempt recovery
        HLSjs->>CDN: Retry request
    end

    alt Safari Browser
        Browser->>Browser: Detect Safari
        Browser->>AudioElement: Use native HLS
        AudioElement->>CDN: Direct streaming
    end
```

---

## Deployment Architecture

### Production Deployment

```mermaid
graph TB
    subgraph "Internet"
        Users[Users]
        DNS[DNS]
    end

    subgraph "Load Balancer / Reverse Proxy"
        LB[Nginx / Traefik<br/>SSL Termination<br/>Load Balancing]
    end

    subgraph "Application Servers"
        App1[Radio Calico<br/>Container 1<br/>Docker]
        App2[Radio Calico<br/>Container 2<br/>Docker]
        App3[Radio Calico<br/>Container 3<br/>Docker]
    end

    subgraph "Database Cluster"
        Primary[(PostgreSQL<br/>Primary<br/>Read/Write)]
        Replica1[(PostgreSQL<br/>Replica 1<br/>Read Only)]
        Replica2[(PostgreSQL<br/>Replica 2<br/>Read Only)]
    end

    subgraph "Monitoring & Logging"
        Monitoring[Prometheus<br/>Grafana]
        Logging[ELK Stack<br/>Centralized Logs]
        Alerts[Alerting<br/>PagerDuty/Slack]
    end

    subgraph "Backup & Recovery"
        Backup[Automated Backups<br/>Daily/Weekly]
        S3[S3 / Object Storage<br/>Backup Storage]
    end

    Users --> DNS
    DNS --> LB
    LB --> App1
    LB --> App2
    LB --> App3

    App1 --> Primary
    App2 --> Primary
    App3 --> Primary

    App1 -.-> Replica1
    App2 -.-> Replica2
    App3 -.-> Replica1

    Primary --> Replica1
    Primary --> Replica2

    App1 --> Monitoring
    App2 --> Monitoring
    App3 --> Monitoring
    Primary --> Monitoring

    App1 --> Logging
    App2 --> Logging
    App3 --> Logging

    Monitoring --> Alerts

    Primary --> Backup
    Backup --> S3

    style Users fill:#e1f5ff
    style LB fill:#f3e5f5
    style App1 fill:#e8f5e9
    style App2 fill:#e8f5e9
    style App3 fill:#e8f5e9
    style Primary fill:#fce4ec
    style Replica1 fill:#fce4ec
    style Replica2 fill:#fce4ec
    style Monitoring fill:#fff4e6
    style Backup fill:#f3e5f5
```

### Development/Local Deployment

```mermaid
graph TB
    subgraph "Developer Machine"
        subgraph "Docker Compose Dev"
            DevApp[App Container<br/>Hot-reload enabled<br/>Volume mounted<br/>Debug port 9229]
            DevDB[(Dev Database<br/>Port 5433)]
            TestDB[(Test Database<br/>Port 5434)]
        end

        subgraph "Local Tools"
            IDE[IDE / Editor<br/>VSCode]
            Terminal[Terminal<br/>Make commands]
            Browser[Browser<br/>DevTools]
        end

        IDE --> DevApp
        Terminal --> DevApp
        Browser --> DevApp
        DevApp --> DevDB
        DevApp --> TestDB
    end

    subgraph "CI/CD"
        GitHub[GitHub Actions<br/>Automated tests]
        DevApp -.-> GitHub
    end

    style DevApp fill:#e1f5ff
    style DevDB fill:#fce4ec
    style TestDB fill:#fce4ec
    style IDE fill:#e8f5e9
    style GitHub fill:#fff4e6
```

---

## Technology Stack

```mermaid
mindmap
  root((Radio Calico))
    Frontend
      HTML5
      CSS3
      Vanilla JavaScript
      HLS.js
      Canvas API
      WebGL
      Web Audio API
    Backend
      Node.js 20
      Express.js 5
      PostgreSQL 16
      pg connection pool
      dotenv
    Testing
      Jest 30
      Supertest
      Testing Library
      jsdom
      96 tests
      87% coverage
    DevOps
      Docker
      Docker Compose
      GitHub Actions
      Make
      Nginx optional
    Security
      npm audit
      Content Security
      Non-root user
      Environment secrets
    Monitoring
      Health checks
      Logging
      Error tracking
      optional: Codecov
```

---

## Scaling Considerations

### Horizontal Scaling

```mermaid
graph LR
    subgraph "Scaling Strategy"
        Single[Single Instance<br/>< 1000 users]
        Multiple[Multiple Instances<br/>1000 - 10000 users]
        Clustered[Clustered Setup<br/>> 10000 users]

        Single -->|Add instances| Multiple
        Multiple -->|Add cluster| Clustered
    end

    subgraph "Load Distribution"
        RR[Round Robin]
        Sticky[Sticky Sessions]
        Geo[Geographic]

        Multiple --> RR
        Multiple --> Sticky
        Clustered --> Geo
    end

    subgraph "Database Scaling"
        Vertical[Vertical Scaling<br/>More CPU/RAM]
        ReadReplicas[Read Replicas<br/>Scale reads]
        Sharding[Sharding<br/>Partition data]

        Single --> Vertical
        Vertical --> ReadReplicas
        ReadReplicas --> Sharding
    end
```

---

## Security Architecture

```mermaid
graph TB
    subgraph "Security Layers"
        subgraph "Network Security"
            Firewall[Firewall Rules]
            DDoS[DDoS Protection]
            RateLimit[Rate Limiting]
        end

        subgraph "Application Security"
            InputVal[Input Validation]
            SQLInjection[SQL Injection Prevention<br/>Prepared Statements]
            XSS[XSS Prevention]
            CORS[CORS Configuration]
        end

        subgraph "Authentication & Authorization"
            Fingerprint[User Fingerprinting]
            NoAuth[No Traditional Auth<br/>Anonymous Ratings]
        end

        subgraph "Container Security"
            NonRoot[Non-root User]
            MinImage[Minimal Base Image<br/>Alpine Linux]
            NoSecrets[No Secrets in Image]
            ScanImage[Image Scanning]
        end

        subgraph "Data Security"
            Encryption[TLS/SSL Encryption]
            EnvVars[Environment Variables]
            SecureDB[Secure DB Connection]
            Backups[Encrypted Backups]
        end

        subgraph "Monitoring & Auditing"
            SecAudit[Security Audits<br/>npm audit]
            DepCheck[Dependency Checks]
            LogMonitor[Log Monitoring]
            AlertSys[Alert System]
        end
    end

    Firewall --> RateLimit
    RateLimit --> InputVal
    InputVal --> SQLInjection
    SQLInjection --> SecureDB
    EnvVars --> SecureDB
    SecAudit --> DepCheck
    DepCheck --> AlertSys

    style Firewall fill:#ffcdd2
    style InputVal fill:#fff9c4
    style NonRoot fill:#c8e6c9
    style Encryption fill:#bbdefb
    style SecAudit fill:#f8bbd0
```

---

## Summary

Radio Calico is a modern, containerized web application built with:

- **Frontend:** Vanilla JavaScript with modular architecture
- **Backend:** Node.js/Express with PostgreSQL
- **Deployment:** Docker with production and development configurations
- **CI/CD:** GitHub Actions with automated testing and security scanning
- **Monitoring:** Health checks, logging, and optional coverage tracking
- **Security:** Multi-layered security approach with regular audits

The architecture is designed for:
- ✅ Scalability - Horizontal scaling with load balancing
- ✅ Reliability - Health checks and error recovery
- ✅ Security - Multiple security layers and regular audits
- ✅ Maintainability - Clean separation of concerns
- ✅ Testability - 96 tests with 87% coverage
- ✅ Deployability - Docker containers with CI/CD automation
