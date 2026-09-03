> **Source:** Gemini deep-research, 2026-09-03. Prompt: hosting for world-api + operator, not a rewrite of the economy.  
> Perplexity failed on this prompt. Distilled decision also lives on the Notion VEND page.  
> **Do not copy sample rent/stipend from any Gemini dump into the sim.** Live knobs are in `src/lib/vnd/catalog.ts`.

---



## **Verdict in 5 Lines**

The optimal baseline infrastructure is a dedicated Hetzner Cloud CPX22 instance running Coolify, providing three AMD vCPUs and 4 GB RAM for under $11 monthly with unmetered internal bandwidth and zero idle sleep risks1. If a fully managed platform-as-a-service is mandated, Railway Pro ($20 monthly base plus metered usage, totaling $25 to $35) is the primary alternative, provided serverless sleep is explicitly disabled and TCP database proxies are avoided4. A single PostgreSQL 16 engine utilizing row-level locks and transaction-safe queue polling (FOR UPDATE SKIP LOCKED) entirely obsoletes Redis while eliminating distributed dual-write corruption hazards8. Physically isolating the authoritative World Ledger from the Operator Agent runtime across an authenticated HTTPS boundary is mandatory to prevent prompt-injected agents from executing raw database operations11. Closed simulated currencies carry zero legal banking risk under current regulations, but operational naming conventions must strictly omit crypto-related terminology to bypass automated infrastructure abuse filters13.

## **Comparative Platform Evaluation**

Evaluating hosting options for persistent, multi-agent economic benchmarks requires balancing continuous background compute guarantees, low-latency relational storage, operational overhead, and rigid budgetary limits between $20 and $50 per month.

| Host Platform | Always-On Compute Model | PostgreSQL Capabilities | Price Band (Monthly) | Main Platform Risk |
| :---- | :---- | :---- | :---- | :---- |
| **Hetzner Cloud (CPX22) \+ Coolify** | Dedicated KVM slice; continuous compute with zero throttling or sleep1. | Local containerized PostgreSQL 16 on NVMe; zero network egress fees3. | $6.50 – $11.00 (€7.99 base \+ automated backups)1 | Unmanaged host operating system requires initial SSH setup and firewall hardening1. |
| **Railway (Pro Workspace)** | Metered per-minute compute; configurable serverless auto-sleep4. | Unmanaged Docker container template mounted to a persistent block volume17. | $20.00 – $38.00 ($20 base credit \+ compute overage)5 | Silent worker suspension if inbound HTTP ceases; volume locks cause deploy downtime7. |
| **Fly.io** | Hardware-virtualized MicroVMs with configurable autostop/autostart22. | Unmanaged container on Fly Volumes ($0.15/GB) or Managed Postgres ($38/mo base)19. | $12.00 – $22.00 (Unmanaged) / $45.00+ (Managed)19 | High pricing baseline for managed databases; complex regional routing configurations19. |
| **Render** | Dedicated Web Services and Background Workers19. | Managed PostgreSQL ($7/mo Starter tier, 256 MB RAM ceiling)19. | $21.00 – $35.00 (Starter Web \+ Worker \+ DB)19 | Starter database memory constraints cause out-of-memory crashes; high bandwidth overages ($0.15/GB)19. |
| **Google Cloud Run** | Serverless container instances; requires continuous CPU allocation25. | Managed Cloud SQL PostgreSQL (db-f1-micro shared instance)28. | $42.00 – $65.00 (Always-on CPU \+ Cloud SQL compute)28 | High hourly baseline cost for continuous compute; complex VPC connector latency26. |
| **Vercel UI \+ Remote Backend** | Serverless Fluid Functions scaling to zero on request completion21. | External third-party database connection required (e.g., Neon or Supabase)32. | $20.00 (Vercel Pro) \+ external host costs21 | Architectural mismatch; runtime lifecycle kills background agent loops and clock daemons21. |

Hetzner Cloud paired with Coolify provides the highest compute and memory density within the target cost profile3. The CPX22 virtual server supplies three dedicated AMD EPYC cores, 4 GB of ECC RAM, and 80 GB of NVMe storage, running all application components inside isolated Docker containers on a single internal network bridge3. Coolify automates Git-driven deployments, reverse proxy routing, and SSL certificate provisioning via Traefik while eliminating all bandwidth metering charges up to 20 TB per month15.  
Railway offers rapid developer setup through its graphical workspace canvas and internal private networking18. However, its resource billing structure—charging $20 per vCPU-month and $10 per GB RAM-month—accumulates continuously for always-on containers4. Deploying the World API, the Operator agent worker, and a PostgreSQL database consumes roughly $30 to $40 in metered compute, exceeding the $20 usage credit included with the Pro subscription5.  
Fly.io operates on low entry rates for headless machines but forces difficult architectural compromises regarding database durability19. Its managed PostgreSQL service carries a prohibitive $38 monthly baseline, while running unmanaged database containers on single block volumes requires custom scripting for snapshots, WAL management, and recovery19.  
Render enforces strict resource isolation between Web Services and Background Workers, but its entry-level database tier is capped at 256 MB of RAM, which risks connection exhaustion and out-of-memory terminations under concurrent agent operations19.  
Google Cloud Run can maintain background execution only when configured with instance-based billing (--no-cpu-throttling) and a minimum instance count of one26. Running a single continuous 1 vCPU container on Cloud Run costs roughly $30 monthly, which, when combined with Google Cloud SQL, exceeds the upper limit of a hobbyist budget28.  
Splitting a frontend user interface onto Vercel while executing the backend elsewhere introduces unnecessary network latency and state synchronization friction21. Vercel functions cannot host persistent execution loops or deterministic day clocks because they terminate upon returning an HTTP response21.

## **Recommended Architecture Diagram in Words**

The production architecture is structured into two physically separated execution zones connected exclusively over an authenticated HTTPS transport layer, isolating simulation state from autonomous agent execution.

### **The World Simulation Zone (Hosted Platform)**

The World Simulation Zone acts as the authoritative source of economic truth and consists of two primary services communicating over an internal private bridge:

> 1. **Authoritative Ledger Service**: An isolated PostgreSQL 16 database running on persistent block storage. It contains the relational tables for account balances, product catalogs, order pipelines, system configuration, action queues, and an immutable append-only audit ledger. All balance modifications are bound by database-level check constraints that enforce positive balances and prevent negative transactions.  
> 2. **World HTTP API Engine**: A stateless web application exposed to the public internet via an automated reverse proxy with managed TLS. The engine contains an Economic Action Router that accepts typed command payloads, an Invariant Policy Engine that cryptographically and logically validates shop policies, and an Internal Clock Trigger. The World API interacts with the database through a high-performance local connection pool.

### **The Operator Execution Zone (Hosted Worker or Remote Development Machine)**

The Operator Zone contains the autonomous reasoning components and operates under the assumption of zero internal access to the World database:

> 1. **Operator Daemon Process**: A long-running asynchronous worker process executing on the cloud host or locally on a developer laptop. It maintains an internal event loop that orchestrates specialized agent sub-routines, including a Shop Strategy Evaluator, an Inventory Rebalancer, and a Customer Interaction Worker.  
> 2. **Agent Memory Engine**: An embedded relational database (such as SQLite) or an isolated PostgreSQL schema residing entirely within the Operator process space. It stores historical logs, observation embeddings, conversation transcripts, and long-term planning state.  
> 3. **Model Orchestration Layer**: Outbound HTTPS connections to external foundation model inference APIs (e.g., Anthropic Claude or OpenAI GPT) that drive agent reasoning11.

### **Public Secure Boundary Interface**

Communication between the Operator and the World occurs entirely over public HTTPS:

> 1. **Outbound Ingestion**: The Operator continuously polls the World API or receives incoming customer messages via webhooks.  
> 2. **Cryptographic Authentication**: Every outbound HTTP request from the Operator includes a scoped Bearer token containing a high-entropy API key. The World API verifies this key using constant-time hashing against its internal credential store before processing any action.  
> 3. **Typed Economic Actions**: To modify world state, the Operator submits strongly typed JSON action payloads (such as placing wholesale orders or setting unit prices). The World API processes the action within an atomic database transaction, commits the changes to the ledger, records the audit trail, and returns a structured receipt.

## **Railway Technical Failure Modes and Risk Surface**

Deploying an autonomous multi-agent simulation on Railway exposes several infrastructure edge cases that must be mitigated to prevent runtime failures:

### **Worker Suspension via Auto-Sleep Defaults**

Railway provides a "Serverless" sleep optimization mechanism that scales idle services to zero compute when no inbound network requests are detected for ten minutes7. If an engineer provisions the Operator Daemon as a standard service with serverless settings enabled, Railway halts the container when incoming HTTP traffic ceases7. This immediately kills background agent loops, pending cron timers, and asynchronous polling workers. To maintain continuous execution, the Operator must be deployed as an always-on service with auto-sleep explicitly disabled7.

### **Block Volume Exclusivity and Deployment Downtime**

Railway persistent volumes are single-host network block devices that cannot be mounted across multiple container replicas simultaneously20. During a code deployment or image rebuild, Railway cannot execute a zero-downtime rolling update on a service attached to a persistent volume21. The orchestrator must send a termination signal to the running container, unmount the volume, mount it to the newly initialized container, and execute startup checks20. This process introduces an unavoidable operational interruption of 15 to 45 seconds during which the database and world API are unavailable.

### **Egress Bandwidth Costs on Database TCP Proxies**

Railway isolates container instances within an internal IPv6 mesh network where private communication carries zero bandwidth charges18. However, exposing the PostgreSQL database to external clients requires enabling the Railway TCP Proxy, which generates a public host and port6. Traffic traversing this proxy is metered as external internet egress at $0.05 per gigabyte4. If a developer attaches a local agent framework or analytical client to the production database via this public proxy, continuous polling and memory synchronization will rapidly inflate monthly resource bills5. Connecting remote developer environments must instead be handled via encrypted CLI tunnels (railway connect postgres \--tunnel-only) to avoid proxy egress fees6.

### **Graceful Termination Windows for Long-Running Agent Tasks**

During infrastructure redeployments or container rebalancing, Railway issues a standard SIGTERM signal to all processes, followed by a hard SIGKILL termination after a brief grace period (defaulting to 10 seconds). Large language model tool-calling sequences, complex market reasoning steps, or multi-item inventory balance reconciliations often require 20 to 45 seconds to complete. If the container process is terminated mid-execution, agent working memory risks corruption unless the daemon intercepts SIGTERM signals, suspends new loop iterations, and commits in-flight state to persistent storage before shutting down.

### **Snapshot Coupled Lifecycles and Backup Limits**

Railway provides automated, copy-on-write volume snapshots scheduled at daily, weekly, or monthly intervals6. However, these snapshots exist as volume metadata within the platform and are not decoupled from the parent infrastructure6. If a user accidentally deletes or wipes the PostgreSQL service or its mounted volume, all associated automated snapshots are permanently purged simultaneously6. Furthermore, Railway blocks manual snapshot operations whenever actual disk consumption exceeds 50% of the provisioned volume capacity6. Production state cannot rely solely on platform volume snapshots; it demands scheduled logical database dumps transferred to an external object storage bucket6.

## **Architectural Topology: Decoupling World and Operator**

The physical decoupling of the World Engine from the Operator Agent runtime is an architectural requirement driven by security, experimental validity, and system resilience.

### **Preservation of the Evaluation Boundary**

The central finding of enterprise agent evaluations, including Anthropic’s Project Vend and the Vending-Bench framework, is that autonomous models frequently experience alignment failures, boundary confusion, or prompt injections11. In Project Vend, Claude 3.7 Sonnet suffered identity confabulations and was easily persuaded by internal colleagues to sell inventory at extreme losses11. If the Operator process shares a local container, direct memory access, or raw SQL credentials (DATABASE\_URL) with the World Ledger, an agent compromised by a prompt injection attack could execute arbitrary database updates to alter its balance or manipulate audit records. Enforcing an HTTPS boundary ensures that the Operator has access only to typed API endpoints, compelling every state transition to pass through the World’s invariant policy engine11.

### **Independent Failure Domains and Blast Radius Containment**

Autonomous agent processes exhibit high variance in runtime stability12. External LLM API calls regularly encounter upstream HTTP 500 errors, rate-limiting backoffs, and schema deserialization exceptions when parsing complex JSON outputs12. In an unsegmented monolithic deployment, an uncaught runtime exception or memory leak in the agent framework risks crashing the entire operating system process, taking down the economic clock and HTTP transaction engine. Decoupling ensures that if the Operator enters a crash loop, the economic ledger remains completely stable and accessible to human players or external evaluation harnesses11.

### **Local Developer Velocity and Remote Attachment**

Splitting the architecture allows the World Engine to remain deployed continuously on cloud infrastructure while the Operator runs locally on a development laptop. Developing agent reasoning requires continuous prompt tweaking, temperature adjustment, step-by-step debugger stepping, and local tracing. A public HTTPS API on the World Engine allows the local agent process to authenticate against the cloud simulation from anywhere without requiring local database migrations or cloud redeployment cycles.

## **State Synchronization: PostgreSQL Native Queues vs. Redis**

At the scale of an evaluation test harness supporting up to several dozen agents and tens of thousands of daily actions, **introducing Redis or external message brokers creates unnecessary infrastructural complexity and introduces data corruption hazards**8. PostgreSQL natively supplies high-throughput transactional queuing mechanisms that outperform separate caching layers in data safety and consistency8.

### **Concurrency and Job Fetching via SKIP LOCKED**

PostgreSQL allows developers to construct concurrent, atomic task queues directly within the relational ledger by combining SELECT ... FOR UPDATE with the SKIP LOCKED directive8. When a worker queries for pending economic actions or background agent jobs, the database engine locks only the eligible rows and immediately skips any rows currently locked by parallel transactions8. This allows multiple background worker threads or external agent processes to pull work concurrently from a single action\_queue table without encountering lock contention or deadlocks8.

### **Eliminating Distributed Dual-Write Hazards**

The primary failure mode of architectures that pair PostgreSQL with Redis is the distributed dual-write problem. In a split system, when an agent executes a shop purchase, the application must perform two distinct network writes: debiting the balance within PostgreSQL and enqueuing the fulfillment event within Redis. If a network disruption, out-of-memory termination, or power event occurs between these operations, the system desynchronizes: currency has been subtracted from the account ledger, but the fulfillment job was never queued in Redis.  
Consolidating queues within PostgreSQL allows the currency debit, inventory adjustment, and task status update to execute within **a single atomic ACID transaction**8. If any step fails or the container terminates, the database automatically rolls back all changes, guaranteeing that play money is never debited without a corresponding state transition8.

### **Operational Simplicity and Throughput Benchmarks**

Empirical benchmarks demonstrate that a basic PostgreSQL queue using SKIP LOCKED can process between 800 and 5,000 tasks per minute on minimal shared compute hardware, scaling up to 50,000 jobs per second on dedicated instances—performance far exceeding the throughput requirements of a closed agent benchmark8. Eliminating Redis reduces memory overhead, drops container orchestration complexity, and avoids managing two distinct persistence and backup schemes8.

## **Regulatory Compliance and Terms of Service Landscape**

Operating a simulated market test harness requires navigating cloud provider Acceptable Use Policies and financial regulations to prevent sudden account suspension13.

### **Legal and Banking Regulatory Status**

A closed simulation test harness that utilizes non-redeemable virtual play tokens does not qualify as a money transmission business under FinCEN regulations, nor does it violate state or federal banking laws. Because virtual tokens cannot be purchased with fiat currency, cannot be redeemed for legal tender, cannot be transferred outside the platform, and cannot yield real-world prizes, the system holds the exact legal status of closed video game currencies and board game scores. No KYC (Know Your Customer), AML (Anti-Money Laundering), or financial licenses are required.

### **Hosting Provider Terms of Service and Abuse Detection**

PaaS and VPS platforms maintain automated security systems to detect abusive workloads, primarily cryptocurrency operations and malicious bot networks13.

* **Cryptocurrency Restrictions**: Hetzner enforces a strict policy prohibiting cryptocurrency mining, node validation, and blockchain-related activities across its cloud instances13. Automated network analyzers continuously monitor outbound traffic for known peer-to-peer protocols and consensus communications13. Running software that mimics blockchain RPC nodes or triggers crypto detection signatures will result in immediate account termination13.  
* **Automated Bot Detection**: Cloud providers monitor network patterns for rapid-fire HTTP generation, high connection rates, or credential-testing patterns. An autonomous agent stuck in an unthrottled retry loop sending 500 requests per second against an API will trigger automated DDoS and botnet defense mitigations, leading to IP rate-limiting or service blacklisting.

### **Platform Compliance Guidelines**

> 1. **Naming Conventions**: Maintain conventional business and software terminology across repository names, build files, environment variables, and public domain names. Avoid terms like token, mint, wallet, crypto, faucet, or blockchain, using instead virtual\_credits, ledger\_accounts, unit\_inventory, and shop\_balance.  
> 2. **Deterministic Request Throttling**: Embed exponential backoff algorithms and client-side rate limiters directly within the Operator’s HTTP client to guarantee that upstream API errors never degenerate into connection storms.

## **Concrete Recommended Production Stack**

### **1\. Services Configuration and Hardware Sizing**

The production architecture is deployed on a single **Hetzner Cloud CPX22 instance** (3 AMD EPYC vCPUs, 4 GB RAM, 80 GB NVMe, €7.99 monthly) running Ubuntu 24.04 LTS and managed through Coolify1:

* **Service 1: PostgreSQL Ledger (db-core)**: PostgreSQL 16 official image allocated 1.0 vCPU and 1.5 GB of RAM. The database engine is configured with shared\_buffers \= '384MB' and work\_mem \= '16MB'. A dedicated local Docker volume is mounted to /var/lib/postgresql/data48.  
* **Service 2: World Engine API (world-api)**: Python 3.12 (FastAPI and Pydantic) or Node.js 20 (Express and TypeScript) allocated 0.5 vCPU and 512 MB of RAM. It connects to the database via internal Docker bridge networking using PgBouncer for transaction-level pooling.  
* **Service 3: Operator Runtime (operator-worker)**: Python 3.12 utilizing AsyncIO allocated 1.0 vCPU and 1.5 GB of RAM. It executes the background agent event loop and maintains its internal memory store via an isolated SQLite database or dedicated PostgreSQL schema.

### **2\. Process Supervision and Daemon Architecture**

Inside the containers, background agent loops and API servers must be managed by robust init-tier process supervisors to prevent zombie processes and ensure immediate restarts upon uncaught failures:

* In Python runtimes, the Operator Daemon uses AsyncIO task groups supervised by an outer process monitor (such as Supervison or a Docker restart policy set to unless-stopped).  
* The Operator Daemon initializes three concurrent asynchronous tasks:  
  * An Event Ingestion Worker that long-polls the World API for pending customer messages and environment events.  
  * A Periodic Strategy Evaluator that triggers every ten simulated minutes to calculate stock levels, check balance invariants, and identify replenishment needs.  
  * An Economic Clock Responder that executes comprehensive daily rebalancing when the world advances to a new calendar day.

### **3\. Environment Variables Configuration**

The environment configuration strictly isolates database access credentials from the client-facing agent credentials:

#### **World API Environment Configuration (.env.world)**

Bash  
ENVIRONMENT=production  
PORT=8000  
DATABASE\_URL=postgresql://world\_admin:k8Jd2M9qLx7@db-core:5432/world\_ledger?sslmode=disable  
SIMULATION\_TICK\_SECONDS=3600  
BASE\_RENT\_PER\_DAY=50.00  
DAILY\_CUSTOMER\_STIPEND=10.00  
API\_KEY\_SALT=8f3c719e2a4b5d6e8c0a1f3e5b7a9c2d  
CORS\_ORIGINS=https://admin.yourdomain.com

#### **Operator Daemon Environment Configuration (.env.operator)**

Bash  
ENVIRONMENT=production  
WORLD\_API\_BASE\_URL=https://api.yourdomain.com/v1  
OPERATOR\_API\_KEY=op\_live\_3k7x9Pq2m8Wv5tL1yR4n0sB  
ANTHROPIC\_API\_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxx  
MODEL\_NAME=claude-3-7-sonnet-20250219  
MAX\_DAILY\_LLM\_COST\_USD=10.00  
LOCAL\_STORAGE\_PATH=/data/operator\_memory.sqlite

### **4\. Operator Authentication via Hashed API Keys**

Authentication between the Operator and the World API relies on high-entropy API keys rather than static shared passwords:

> 1. **Key Generation**: The World system provisions keys formatted with an identifying prefix and high-entropy payload (e.g., op\_live\_ followed by 32 cryptographically random alphanumeric characters).  
> 2. **Database Storage**: The raw key is displayed to the user exactly once. The database stores only the SHA-256 hash of the key, along with account associations, active status, and explicit scopes (such as actions:execute and state:read).  
> 3. **Request Verification**: Incoming HTTP requests present the key via the Authorization: Bearer \<key\> header. The World API hashes the incoming token using SHA-256 and executes a constant-time comparison against the active keys table.

### **5\. Deterministic Economic Day Clock Implementation**

The simulation must not depend on real-time wall clocks for economic transitions. Temporal progression must be modeled deterministically through explicit calendar ticks11:

* **Database State Model**: The World maintains a single-row simulation\_clock table recording current\_day, is\_paused, and last\_tick\_timestamp.  
* **Execution Trigger**: The simulation advances when an authorized POST request hits /api/v1/world/tick. This endpoint can be triggered by a system cron job (e.g., every 60 minutes) or stepped manually during testing.  
* **Atomic Tick Transaction**: When triggered, a single atomic SQL transaction executes the following steps:  
  1. The current\_day integer is incremented by one.  
  2. Operating rent is subtracted from all active shop balances.  
  3. Daily stipends are credited to customer accounts.  
  4. Pending wholesale orders matching the new day are moved from in\_transit to delivered, and corresponding quantities are added to the shop's active inventory.  
  5. The entire transition is recorded in the immutable audit log table, and the transaction commits.

### **6\. Automated Backup Strategy**

Relying on platform-native volume snapshots leaves the database vulnerable to cascade deletion if the volume service is dropped6. The backup strategy combines logical database dumps with offsite object storage:

* A lightweight containerized cron job executes pg\_dump \-Fc every 6 hours, creating a compressed, binary-format database export6.  
* The export is encrypted locally using GPG and uploaded over HTTPS to an external Cloudflare R2 bucket (which provides S3-compatible APIs and zero bandwidth egress fees)33.  
* Retention is strictly managed: 4 intraday snapshots, 7 daily snapshots, and 4 weekly archives are retained, with older snapshots pruned automatically via R2 lifecycle rules.

## **Adversarial Expansion: Autonomous Customer Agents**

Expanding the simulation harness to incorporate autonomous customer AIs (red-team attackers attempting social engineering, prompt manipulation, and discount extraction) alters the architectural requirements11.

### **Enforcement of Structural Invariants Over Natural Language**

The fundamental finding of Anthropic’s Project Vend was that models trained to be helpful, cooperative conversational assistants will rapidly succumb to social engineering, emotional appeals, and fake authority cues from customers11. During the experiment, employees coaxed the AI shopkeeper into offering massive discounts and giving away high-value items for free11.  
To insulate the test harness against this failure mode, natural language chat must be completely decoupled from economic settlement11:

* **Chat Endpoints Carry Zero Transaction Authority**: A customer message received via /api/v1/chat is treated as unverified natural language string data. The chat interface cannot debit balances or release inventory11.  
* **Execution Through Strongly Typed Schemas**: A sale can only occur when an agent issues a validated action payload to /api/v1/actions/execute specifying item\_id, offered\_price, and buyer\_id.  
* **Deterministic Policy Engine Interception**: Before any action interacts with the SQL ledger, the World Policy Engine verifies hardcoded invariants. If an agent attempts to sell an item below its wholesale acquisition cost, or attempts to transfer goods without a corresponding currency credit, the database transaction throws an exception and halts execution11.

### **Inference Rate Limiting and Circuit Breakers**

Adversarial red-team agents can easily trigger infinite conversational loops, generating massive token consumption across LLM APIs11:

* **Token Bucket Throttling**: The World API enforces rate limits on customer interactions using a Redis-free PostgreSQL or in-memory leaky bucket filter. Each customer agent is constrained to a maximum of ten conversational turns and two economic proposals per simulated day.  
* **Financial Circuit Breakers**: The Operator Daemon must track cumulative API inference costs in its local database. If total LLM expenditure exceeds a fixed daily threshold (e.g., $10.00), the Operator activates an emergency circuit breaker, rejecting incoming customer inquiries with static responses until the budget window resets.

### **Sandboxing and Security Isolation**

Customer agents represent untrusted code and must be strictly quarantined from the core environment:

* Red-team agents must execute on a physically separate host or within an isolated network sandbox that possesses zero network routes to the private database network17.  
* Customer agents must authenticate using restricted API credentials (ROLE\_CUSTOMER). The World API authorization middleware blocks customer keys from accessing administrative endpoints, wholesale order functions, or other players' transaction histories.

## **Railway Implementation Playbook**

If deploying the harness to Railway, apply the following configuration parameters:

### **What to Do First on Railway**

* **Provision Official Base Images**: Deploy PostgreSQL using the official Railway template, which configures necessary SSL settings and mount parameters automatically17.  
* **Verify Persistent Volume Mounting**: Open the PostgreSQL service settings and confirm that a persistent volume is mounted directly to /var/lib/postgresql/data48. Verify that scheduled volume backups are enabled under the service Backups tab6.  
* **Bind Services via Private Networking**: Configure the World API database connection string using Railway's internal service variables (${{Postgres.RAILWAY\_PRIVATE\_DOMAIN}}) rather than public hostnames, ensuring traffic stays on the free private mesh network18.  
* **Disable Serverless Sleep on Background Services**: Navigate to the Operator service settings and ensure that the Serverless or Auto-Sleep toggle is turned completely off7.  
* **Establish Workspace Usage Caps**: Access account billing settings and set a hard spending limit of $35.00 to prevent runaway billing if an agent enters an infinite retry loop37.

### **What NOT to Do on Railway**

* **Do NOT Use the Public TCP Proxy for Application Traffic**: Do not connect the World API or Operator to PostgreSQL via the DATABASE\_PUBLIC\_URL variable6. The TCP proxy routes traffic over the public internet, adding latency and incurring outbound bandwidth fees of $0.05 per gigabyte4.  
* **Do NOT Store Agent State on Local Container Filesystems**: Files written to standard container directories are completely destroyed during deployments and host restarts39. All persistent data must reside within PostgreSQL or an attached volume39.  
* **Do NOT Rely on In-Memory Timers for the Economic Clock**: Do not run the simulation clock using language timers like setInterval21. A container restart will reset the timer; temporal state must always be read from the database ledger.  
* **Do NOT Permit Volume Utilization to Exceed Fifty Percent**: Because Railway's manual volume snapshots fail when disk utilization crosses 50%, expand the volume storage allocation well before reaching capacity6.

## **Infrastructure Demarcation: Self-Hosting vs. Managed Services**

To optimize the architecture within a $20 to $50 monthly budget, system components should be partitioned between self-hosted services and external platforms based on operational overhead and cost efficiency:

### **Components to Run Locally or on a Dedicated Virtual Server (Hetzner / Railway)**

* **The World API and Invariant Engine**: Running the core business logic on the virtual server ensures immediate access to the database and eliminates external API latency.  
* **The PostgreSQL Database Core**: Colocating the database with the API over an internal container network provides sub-millisecond query response times, zero bandwidth transfer fees, and total control over relational transactions18.  
* **The Operator Background Daemon**: Executing the agent loop on the server provides continuous, unthrottled uptime for task monitoring and evaluation loops.  
* **Task Queues and Schedulers**: Handled natively within PostgreSQL using transactional locking (FOR UPDATE SKIP LOCKED), removing the operational burden of managing Redis, RabbitMQ, or external queuing clusters8.

### **Components to Offload to External Managed Services**

* **Large Language Model Inference**: Offload entirely to managed foundation model APIs (such as Anthropic Claude or OpenAI GPT)11. Self-hosting open-weight models (e.g., Llama-3-70B) requires expensive GPU hardware rentals that vastly exceed the $50 monthly budget.  
* **Disaster Recovery Backup Storage**: Offload to an external S3-compatible storage tier (such as Cloudflare R2). Encrypted database exports should be transferred out of the primary host datacenter to ensure total recovery capability in the event of server destruction33.  
* **Uptime and Process Monitoring**: Offload to an external synthetic monitoring tool (e.g., Better Uptime or UptimeRobot) to ping the World API /health endpoint every minute, alerting the developer immediately if the background host suffers an outage or out-of-memory crash.  
* **Administrative Visual Dashboards**: If an administrative web interface is built to monitor the economy, deploy it to a serverless platform like Vercel or Cloudflare Pages21. A static frontend connects to the World API over HTTPS, allowing rapid UI iteration without impacting the core simulation engine.

#### **Works cited**

> 1. How I built my self-hosted stack with Hetzner, Coolify and n8n \- Kirako, [https://kirako.ai/en/blog/self-hosted-stack-hetzner-coolify-n8n](https://kirako.ai/en/blog/self-hosted-stack-hetzner-coolify-n8n)  
> 2. I recalculated Hetzner Backup vs Snapshot break-even points after, [https://www.reddit.com/r/hetzner/comments/1w3km43/i\_recalculated\_hetzner\_backup\_vs\_snapshot/](https://www.reddit.com/r/hetzner/comments/1w3km43/i_recalculated_hetzner_backup_vs_snapshot/)  
> 3. Hetzner Cloud Review 2026: Benchmarks, Pricing, and the Real, [https://betterstack.com/community/guides/web-servers/hetzner-cloud-review/](https://betterstack.com/community/guides/web-servers/hetzner-cloud-review/)  
> 4. Pricing Plans | Railway Docs, [https://docs.railway.com/pricing/plans](https://docs.railway.com/pricing/plans)  
> 5. Railway Pricing Calculator (2026) — Estimate Your Monthly Bill, [https://makerkit.dev/pricing-calculator/railway](https://makerkit.dev/pricing-calculator/railway)  
> 6. Back Up and Restore Postgres | Railway Guides, [https://docs.railway.com/guides/postgres-backups-restores](https://docs.railway.com/guides/postgres-backups-restores)  
> 7. Railway Alternative 2026: Pricing, Performance & Features, [https://rafftechnologies.com/learn/compare/raff-vs-railway](https://rafftechnologies.com/learn/compare/raff-vs-railway)  
> 8. PostgreSQL Advisory Locks for Distributed Job Scheduling, [https://mvpfactory.io/blog/postgresql-advisory-locks-for-distributed-job-scheduling-skip-locked-lock/](https://mvpfactory.io/blog/postgresql-advisory-locks-for-distributed-job-scheduling-skip-locked-lock/)  
> 9. PostgreSQL as a Message Queue: Proving the 'Skip Locked, [https://zenriotech.com/blog/postgres-skip-locked-message-queue-vs-rabbitmq-redis-operational-overhead](https://zenriotech.com/blog/postgres-skip-locked-message-queue-vs-rabbitmq-redis-operational-overhead)  
> 10. I Replaced Redis with PostgreSQL (And It's Faster) \- daily.dev, [https://daily.dev/posts/i-replaced-redis-with-postgresql-and-it-s-faster--x7d3o8vu2](https://daily.dev/posts/i-replaced-redis-with-postgresql-and-it-s-faster--x7d3o8vu2)  
> 11. Project Vend: Can Claude run a small shop? (And why ... \- Anthropic, [https://www.anthropic.com/research/project-vend-1](https://www.anthropic.com/research/project-vend-1)  
> 12. Andon Labs' Project Vend: Testing Autonomous AI Agents, [https://intuitionlabs.ai/articles/andon-labs-project-vend-ai](https://intuitionlabs.ai/articles/andon-labs-project-vend-ai)  
> 13. Hetzner? What's the official policy on running crypto nodes? Not, [https://www.reddit.com/r/hetzner/comments/mztvhr/hetzner\_whats\_the\_official\_policy\_on\_running/](https://www.reddit.com/r/hetzner/comments/mztvhr/hetzner_whats_the_official_policy_on_running/)  
> 14. Hetzner cloud server provider bans cryptocurrency mining, [https://www.bleepingcomputer.com/news/cryptocurrency/hetzner-cloud-server-provider-bans-cryptocurrency-mining/](https://www.bleepingcomputer.com/news/cryptocurrency/hetzner-cloud-server-provider-bans-cryptocurrency-mining/)  
> 15. Self-hosting isn't scary: a practical guide with Coolify and Hetzner, [https://darko.io/posts/self-hosting-with-coolify-and-hetzner/](https://darko.io/posts/self-hosting-with-coolify-and-hetzner/)  
> 16. Hetzner \+ Coolify Hardening Checklist: A Battle-Tested Guide, [https://ceaksan.com/en/premium/hetzner-coolify-hardening-checklist](https://ceaksan.com/en/premium/hetzner-coolify-hardening-checklist)  
> 17. PostgreSQL | Railway Docs, [https://docs.railway.com/databases/postgresql](https://docs.railway.com/databases/postgresql)  
> 18. Databases | Railway Docs, [https://docs.railway.com/databases](https://docs.railway.com/databases)  
> 19. Render vs Railway vs Fly.io: 2026 Pricing Showdown \- ExpressTech, [https://expresstech.io/render-vs-railway-vs-fly-io-2026-pricing-showdown/](https://expresstech.io/render-vs-railway-vs-fly-io-2026-pricing-showdown/)  
> 20. Backups | Railway Docs, [https://docs.railway.com/volumes/backups](https://docs.railway.com/volumes/backups)  
> 21. Railway vs Vercel vs Render: which platform should you choose?, [https://northflank.com/blog/railway-vs-vercel-vs-render](https://northflank.com/blog/railway-vs-vercel-vs-render)  
> 22. Railway vs Fly.io (2026): Pricing & Platform Comparison \- Render, [https://render.com/articles/railway-vs-fly-io](https://render.com/articles/railway-vs-fly-io)  
> 23. Fly.io Free Tier 2026: What Can You Actually Host?, [https://www.saaspricepulse.com/blog/flyio-free-tier-2026](https://www.saaspricepulse.com/blog/flyio-free-tier-2026)  
> 24. Fly vs Railway vs Render: deploy costs compared 2026 \- Granite.so, [https://granite.so/blog/fly-vs-railway-vs-render-deploy-costs-compared-2026](https://granite.so/blog/fly-vs-railway-vs-render-deploy-costs-compared-2026)  
> 25. Billing settings for services | Cloud Run | Google Cloud Documentation, [https://docs.cloud.google.com/run/docs/configuring/billing-settings](https://docs.cloud.google.com/run/docs/configuring/billing-settings)  
> 26. Cloud Run gets always-on CPU allocation | Google Cloud Blog, [https://cloud.google.com/blog/products/serverless/cloud-run-gets-always-on-cpu-allocation](https://cloud.google.com/blog/products/serverless/cloud-run-gets-always-on-cpu-allocation)  
> 27. Balancing Cost and Performance on Google Cloud Run, [https://engineering.szns.solutions/balancing-cost-and-performance-on-google-cloud-run/](https://engineering.szns.solutions/balancing-cost-and-performance-on-google-cloud-run/)  
> 28. Google Cloud SQL Pricing \- Bytebase, [https://www.bytebase.com/dbcost/cloudsql-pricing/](https://www.bytebase.com/dbcost/cloudsql-pricing/)  
> 29. PostgreSQL Hosting Options in 2026: Pricing Comparison \- Bytebase, [https://www.bytebase.com/blog/postgres-hosting-options-pricing-comparison/](https://www.bytebase.com/blog/postgres-hosting-options-pricing-comparison/)  
> 30. Set up server-side tagging with Cloud Run | Google Tag Manager, [https://developers.google.com/tag-platform/tag-manager/server-side/cloud-run-setup-guide](https://developers.google.com/tag-platform/tag-manager/server-side/cloud-run-setup-guide)  
> 31. Cloud Run Cost Optimisation: Reduce CPU, Memory and Idle Spend, [https://cloudwebschool.com/docs/gcp/cost-management/cloud-run-cost-optimisation/](https://cloudwebschool.com/docs/gcp/cost-management/cloud-run-cost-optimisation/)  
> 32. 5 Google Cloud SQL for PostgreSQL Alternatives in 2026 \- Sliplane, [https://sliplane.io/blog/google-cloud-sql-postgresql-alternatives](https://sliplane.io/blog/google-cloud-sql-postgresql-alternatives)  
> 33. Deploying a Next.js Full-Stack App on Hetzner with Coolify \- Medium, [https://medium.com/@kapildevkhatik2/escaping-paas-pricing-deploying-a-next-js-full-stack-app-on-hetzner-with-coolify-0e1024931c23](https://medium.com/@kapildevkhatik2/escaping-paas-pricing-deploying-a-next-js-full-stack-app-on-hetzner-with-coolify-0e1024931c23)  
> 34. Coolify, [https://coolify.io/](https://coolify.io/)  
> 35. Cheap cloud-hosting – low vps prices for developers \- Hetzner, [https://www.hetzner.com/cloud/cost-optimized/](https://www.hetzner.com/cloud/cost-optimized/)  
> 36. Railway vs Bolt.new: Technical Comparison and Migration Guide, [https://docs.railway.com/platform/compare-to-bolt](https://docs.railway.com/platform/compare-to-bolt)  
> 37. Cost Control | Railway Docs, [https://docs.railway.com/pricing/cost-control](https://docs.railway.com/pricing/cost-control)  
> 38. Railway vs Fly.io in 2026: pricing, infrastructure, and platform, [https://northflank.com/blog/railway-vs-flyio](https://northflank.com/blog/railway-vs-flyio)  
> 39. i want to recover my data \- Railway Central Station, [https://station.railway.com/questions/i-want-to-recover-my-data-dacafe47](https://station.railway.com/questions/i-want-to-recover-my-data-dacafe47)  
> 40. Native database backups for popular databases, [https://station.railway.com/feedback/native-database-backups-for-popular-data-8ec06824](https://station.railway.com/feedback/native-database-backups-for-popular-data-8ec06824)  
> 41. Anthropic Project Vend \- Museum of Failure, [https://museumoffailure.com/exhibition/anthropic-project-vend](https://museumoffailure.com/exhibition/anthropic-project-vend)  
> 42. Vending-Bench: A Benchmark for Long-Term Coherence of ... \- arXiv, [https://arxiv.org/abs/2502.15840](https://arxiv.org/abs/2502.15840)  
> 43. Project Vend: Can Claude run a small shop? (And why does that, [https://simonwillison.net/2025/Jun/27/project-vend/](https://simonwillison.net/2025/Jun/27/project-vend/)  
> 44. Project Vend: Phase two \- Anthropic, [https://www.anthropic.com/research/project-vend-2](https://www.anthropic.com/research/project-vend-2)  
> 45. Do You Need Redis? PostgreSQL Does Queuing, Locking, & Pub/Sub, [https://www.reddit.com/r/programming/comments/1ff6pdr/do\_you\_need\_redis\_postgresql\_does\_queuing\_locking/](https://www.reddit.com/r/programming/comments/1ff6pdr/do_you_need_redis_postgresql_does_queuing_locking/)  
> 46. Cloud TOS Crypto: When Your Validator Gets Banned \- Hivelocity, [https://www.hivelocity.net/blog/cloud-tos-crypto-when-your-validator-is-not-welcome/](https://www.hivelocity.net/blog/cloud-tos-crypto-when-your-validator-is-not-welcome/)  
> 47. Accident Forgiveness · The Fly Blog \- Fly.io, [https://fly.io/blog/accident-forgiveness/](https://fly.io/blog/accident-forgiveness/)  
> 48. Manage Volumes with the Public API | Railway Docs, [https://docs.railway.com/integrations/api/manage-volumes](https://docs.railway.com/integrations/api/manage-volumes)