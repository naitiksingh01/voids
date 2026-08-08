
export type Mission = {
  day: number;
  title: string;
  passed?: boolean;
  attempts?: number;
  skipped?: boolean;
};

export type Candidate = {
  member: {
    id: string;
    name: string;
    jobRole: string;
    yearsExperience: number;
    education: string;
    status: string;
  };
  missions: Mission[];
  signals: {
    commitDays: number;
    missionsCompleted: number;
    missionsFirstTry: number;
  };
};

export type CurriculumDay = {
  day: number;
  title: string;
  type: "LEARN" | "BUILD" | "PROJECT" | "REVIEW";
  tools: string[];
  objectives: string[];
};

export type Curriculum = {
  cohort: string;
  modules: { n: number; title: string; days: number[] }[];
  days: CurriculumDay[];
};

export const CURRICULUM: Curriculum = {
  cohort: "AI Cohort · 31 days · 8 modules",
  modules: [
    { n: 1, title: "Foundations of Generative AI", days: [1, 2, 3, 4] },
    { n: 2, title: "Prompt Engineering & LLMs", days: [5, 6, 11, 12] },
    { n: 3, title: "Embeddings & Vector Search", days: [7, 8, 9, 10] },
    { n: 4, title: "RAG Systems", days: [13, 14, 15, 16] },
    { n: 5, title: "Agents & Tool Use", days: [17, 18, 19, 20] },
    { n: 6, title: "Evaluation & Observability", days: [21, 22, 23, 24] },
    { n: 7, title: "Deployment & Production", days: [25, 26, 27, 28] },
    { n: 8, title: "Capstone & Soft Skills", days: [29, 30, 31] },
  ],
  days: [
    { day: 1, title: "What is Generative AI?", type: "LEARN", tools: ["Python"], objectives: ["Explain the difference between generative and discriminative models", "Describe the transformer architecture at a high level"] },
    { day: 2, title: "Tokens, Context Windows & Temperature", type: "LEARN", tools: ["OpenAI SDK"], objectives: ["Control randomness with temperature and top-p", "Manage context window limits"] },
    { day: 3, title: "Zero-shot, Few-shot & Chain-of-Thought", type: "BUILD", tools: ["OpenAI SDK", "Python"], objectives: ["Write effective few-shot prompts", "Apply chain-of-thought prompting"] },
    { day: 4, title: "System Prompts & Role Prompting", type: "BUILD", tools: ["OpenAI SDK"], objectives: ["Design robust system prompts", "Use role prompting for specialized behavior"] },
    { day: 5, title: "Prompt Engineering Fundamentals", type: "BUILD", tools: ["OpenAI SDK", "Anthropic"], objectives: ["Iterate on prompts systematically", "Handle edge cases in prompts"] },
    { day: 6, title: "Structured Outputs & Function Calling", type: "BUILD", tools: ["OpenAI SDK", "Pydantic"], objectives: ["Force JSON mode", "Implement basic function calling"] },
    { day: 7, title: "Embeddings Explained", type: "LEARN", tools: ["OpenAI Embeddings", "NumPy"], objectives: ["Generate and compare embeddings", "Understand cosine similarity"] },
    { day: 8, title: "Vector Databases Deep Dive", type: "BUILD", tools: ["Chroma", "Pinecone", "FAISS"], objectives: ["Index documents", "Perform similarity search"] },
    { day: 9, title: "Chunking Strategies", type: "BUILD", tools: ["LangChain", "Python"], objectives: ["Choose chunk size and overlap", "Implement recursive and semantic chunking"] },
    { day: 10, title: "Hybrid Search & Reranking", type: "BUILD", tools: ["BM25", "Cross-encoders"], objectives: ["Combine keyword and vector search", "Apply a reranker"] },
    { day: 11, title: "RAG End-to-End & LLM API Basics", type: "BUILD", tools: ["OpenAI SDK", "Ollama", "Groq", "Python"], objectives: ["Connect retrieval to an LLM", "Configure OpenAI-compatible providers", "Create grounded prompts"] },
    { day: 12, title: "Advanced RAG Patterns", type: "BUILD", tools: ["LangChain", "LlamaIndex"], objectives: ["Implement query rewriting", "Add citation tracking"] },
    { day: 13, title: "Building a Production RAG Pipeline", type: "PROJECT", tools: ["FastAPI", "Chroma", "OpenAI"], objectives: ["Expose a RAG API", "Add basic monitoring"] },
    { day: 14, title: "Multi-Query & HyDE", type: "BUILD", tools: ["LangChain"], objectives: ["Generate multiple search queries", "Use hypothetical document embeddings"] },
    { day: 15, title: "Agent Fundamentals", type: "LEARN", tools: ["LangChain", "OpenAI"], objectives: ["Understand ReAct loops", "Design tool schemas"] },
    { day: 16, title: "Tool Use & Function Calling Agents", type: "BUILD", tools: ["OpenAI Assistants", "LangChain"], objectives: ["Register custom tools", "Handle tool results"] },
    { day: 17, title: "Multi-Agent Systems", type: "BUILD", tools: ["CrewAI", "AutoGen"], objectives: ["Coordinate multiple agents", "Define roles and handoffs"] },
    { day: 18, title: "Memory & State in Agents", type: "BUILD", tools: ["LangGraph", "Redis"], objectives: ["Persist conversation state", "Implement short-term and long-term memory"] },
    { day: 19, title: "MCP & External Tool Protocols", type: "BUILD", tools: ["MCP", "Python"], objectives: ["Expose tools via MCP", "Consume MCP servers"] },
    { day: 20, title: "Building a Custom Agent Framework", type: "PROJECT", tools: ["Python", "Pydantic"], objectives: ["Implement a minimal agent loop", "Add observability hooks"] },
    { day: 21, title: "Evaluation Metrics for LLMs", type: "LEARN", tools: ["RAGAS", "DeepEval"], objectives: ["Measure faithfulness and relevancy", "Create custom metrics"] },
    { day: 22, title: "Automated Evaluation Pipelines", type: "BUILD", tools: ["RAGAS", "Pytest"], objectives: ["Run offline evaluations", "Track regression"] },
    { day: 23, title: "Human-in-the-Loop Feedback", type: "BUILD", tools: ["Streamlit", "FastAPI"], objectives: ["Collect preference data", "Close the feedback loop"] },
    { day: 24, title: "Monitoring, Logging & Observability", type: "BUILD", tools: ["LangSmith", "OpenTelemetry", "Prometheus"], objectives: ["Trace LLM calls", "Set up alerts on cost and latency"] },
    { day: 25, title: "Dockerizing AI Applications", type: "BUILD", tools: ["Docker", "Docker Compose"], objectives: ["Containerize a RAG service", "Manage secrets"] },
    { day: 26, title: "CI/CD for ML & LLM Apps", type: "BUILD", tools: ["GitHub Actions", "Docker"], objectives: ["Automate testing and deployment", "Version models and prompts"] },
    { day: 27, title: "Kubernetes & Scaling Inference", type: "BUILD", tools: ["Kubernetes", "Helm"], objectives: ["Deploy to a cluster", "Configure horizontal pod autoscaling"] },
    { day: 28, title: "Production Hardening & Cost Control", type: "BUILD", tools: ["Kubernetes", "Prometheus", "Grafana"], objectives: ["Implement rate limiting and caching", "Monitor token spend"] },
    { day: 29, title: "Capstone Kickoff & Architecture Review", type: "PROJECT", tools: ["All"], objectives: ["Design end-to-end architecture", "Identify risks"] },
    { day: 30, title: "Capstone Build Day", type: "PROJECT", tools: ["All"], objectives: ["Ship a working MVP", "Document decisions"] },
    { day: 31, title: "Demo Day & Career Prep", type: "REVIEW", tools: [], objectives: ["Present technical decisions", "Answer interviewer-style questions"] },
  ],
};

export const CANDIDATES: Candidate[] = [
  {
    member: {
      id: "CAND-001",
      name: "Sarah Johnson",
      jobRole: "Senior Data Engineer",
      yearsExperience: 9,
      education: "MS Computer Science",
      status: "COMPLETED",
    },
    missions: [
      { day: 7, title: "Embeddings Explained", passed: true, attempts: 1 },
      { day: 9, title: "Chunking Strategies", passed: true, attempts: 2 },
      { day: 11, title: "RAG End-to-End & LLM API Basics", passed: true, attempts: 1 },
      { day: 12, title: "Advanced RAG Patterns", passed: true, attempts: 4 },
      { day: 15, title: "Agent Fundamentals", passed: true, attempts: 3 },
      { day: 24, title: "Monitoring, Logging & Observability", passed: true, attempts: 1 },
      { day: 25, title: "Dockerizing AI Applications", passed: true, attempts: 2 },
      { day: 28, title: "Production Hardening & Cost Control", skipped: true },
      { day: 19, title: "MCP & External Tool Protocols", passed: true, attempts: 5 },
    ],
    signals: { commitDays: 28, missionsCompleted: 29, missionsFirstTry: 18 },
  },
  {
    member: {
      id: "CAND-002",
      name: "Alex Rivera",
      jobRole: "AI Engineer",
      yearsExperience: 4,
      education: "BS Computer Science",
      status: "COMPLETED",
    },
    missions: [
      { day: 7, title: "Embeddings Explained", passed: true, attempts: 1 },
      { day: 11, title: "RAG End-to-End & LLM API Basics", passed: true, attempts: 1 },
      { day: 15, title: "Agent Fundamentals", passed: true, attempts: 1 },
      { day: 16, title: "Tool Use & Function Calling Agents", passed: true, attempts: 2 },
      { day: 19, title: "MCP & External Tool Protocols", passed: true, attempts: 1 },
      { day: 20, title: "Building a Custom Agent Framework", passed: true, attempts: 3 },
      { day: 24, title: "Monitoring, Logging & Observability", skipped: true },
      { day: 27, title: "Kubernetes & Scaling Inference", passed: true, attempts: 4 },
    ],
    signals: { commitDays: 30, missionsCompleted: 30, missionsFirstTry: 24 },
  },
  {
    member: {
      id: "CAND-003",
      name: "Priya Patel",
      jobRole: "DevOps Engineer",
      yearsExperience: 6,
      education: "BS Information Systems",
      status: "COMPLETED",
    },
    missions: [
      { day: 11, title: "RAG End-to-End & LLM API Basics", passed: true, attempts: 3 },
      { day: 24, title: "Monitoring, Logging & Observability", passed: true, attempts: 1 },
      { day: 25, title: "Dockerizing AI Applications", passed: true, attempts: 1 },
      { day: 26, title: "CI/CD for ML & LLM Apps", passed: true, attempts: 2 },
      { day: 27, title: "Kubernetes & Scaling Inference", passed: true, attempts: 1 },
      { day: 28, title: "Production Hardening & Cost Control", passed: true, attempts: 1 },
      { day: 7, title: "Embeddings Explained", passed: true, attempts: 4 },
      { day: 15, title: "Agent Fundamentals", skipped: true },
    ],
    signals: { commitDays: 26, missionsCompleted: 27, missionsFirstTry: 15 },
  },
  {
    member: {
      id: "CAND-004",
      name: "Jordan Lee",
      jobRole: "Business Analyst",
      yearsExperience: 7,
      education: "MBA + CS minor",
      status: "COMPLETED",
    },
    missions: [
      { day: 1, title: "What is Generative AI?", passed: true, attempts: 1 },
      { day: 5, title: "Prompt Engineering Fundamentals", passed: true, attempts: 2 },
      { day: 11, title: "RAG End-to-End & LLM API Basics", passed: true, attempts: 3 },
      { day: 15, title: "Agent Fundamentals", passed: true, attempts: 2 },
      { day: 21, title: "Evaluation Metrics for LLMs", passed: true, attempts: 1 },
      { day: 24, title: "Monitoring, Logging & Observability", skipped: true },
      { day: 29, title: "Capstone Kickoff & Architecture Review", passed: true, attempts: 1 },
    ],
    signals: { commitDays: 22, missionsCompleted: 25, missionsFirstTry: 12 },
  },
];
