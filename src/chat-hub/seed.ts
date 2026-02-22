/**
 * EPIC-003: Internal Chat Hub - Seed Data
 *
 * Canais padrão e 111 agents com suas identidades.
 */

import { type NewChannel } from "./schema.js";

// =============================================================================
// CANAIS PADRÃO
// =============================================================================
export const defaultChannels: NewChannel[] = [
  {
    name: "general",
    description: "Conversas gerais do time",
    topic: "🏠 Canal principal - todos são bem-vindos!",
  },
  {
    name: "engineering",
    description: "Discussões técnicas de engenharia",
    topic: "💻 Código, arquitetura, best practices",
  },
  {
    name: "architecture",
    description: "Decisões de arquitetura e design",
    topic: "🏗️ RFCs, ADRs, design docs",
  },
  {
    name: "product",
    description: "Produto, roadmap e features",
    topic: "📋 O que vamos construir",
  },
  {
    name: "security",
    description: "Segurança e compliance",
    topic: "🔒 Vulnerabilidades, audits, patches",
  },
  {
    name: "devops",
    description: "Infraestrutura e operações",
    topic: "🔧 Deploy, monitoring, incidents",
  },
  {
    name: "qa",
    description: "Qualidade e testes",
    topic: "🐛 Bugs, test coverage, automation",
  },
  {
    name: "random",
    description: "Off-topic, memes, diversão",
    topic: "🎲 Tudo que não cabe em outro lugar",
  },
  {
    name: "standups",
    description: "Daily standups e updates",
    topic: "📊 O que fiz, o que vou fazer, blockers",
  },
  {
    name: "announcements",
    description: "Anúncios importantes",
    topic: "📢 Só admins podem postar",
    isPrivate: false,
  },
];

// =============================================================================
// 111 AGENTS COM IDENTIDADE
// =============================================================================
export const agentIdentities: Array<{
  identifier: string;
  displayName: string;
  avatar: string;
  defaultChannels: string[];
}> = [
  // C-Level (5)
  {
    identifier: "ceo",
    displayName: "CEO",
    avatar: "👔",
    defaultChannels: ["general", "announcements"],
  },
  {
    identifier: "cto",
    displayName: "CTO",
    avatar: "🎯",
    defaultChannels: ["general", "engineering", "architecture"],
  },
  { identifier: "cpo", displayName: "CPO", avatar: "📊", defaultChannels: ["general", "product"] },
  {
    identifier: "ciso",
    displayName: "CISO",
    avatar: "🛡️",
    defaultChannels: ["general", "security"],
  },
  { identifier: "coo", displayName: "COO", avatar: "⚙️", defaultChannels: ["general", "devops"] },

  // Directors/VPs (5)
  {
    identifier: "engineering-director",
    displayName: "Engineering Director",
    avatar: "🏛️",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "product-director",
    displayName: "Product Director",
    avatar: "🎪",
    defaultChannels: ["general", "product"],
  },
  {
    identifier: "design-director",
    displayName: "Design Director",
    avatar: "🎨",
    defaultChannels: ["general", "product"],
  },
  {
    identifier: "qa-director",
    displayName: "QA Director",
    avatar: "🔬",
    defaultChannels: ["general", "qa"],
  },
  {
    identifier: "devops-director",
    displayName: "DevOps Director",
    avatar: "🚀",
    defaultChannels: ["general", "devops"],
  },

  // Tech Leads/Architects (15)
  {
    identifier: "tech-lead",
    displayName: "Tech Lead",
    avatar: "🎯",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "backend-architect",
    displayName: "Backend Architect",
    avatar: "🤖",
    defaultChannels: ["general", "engineering", "architecture"],
  },
  {
    identifier: "frontend-architect",
    displayName: "Frontend Architect",
    avatar: "🖼️",
    defaultChannels: ["general", "engineering", "architecture"],
  },
  {
    identifier: "software-architect",
    displayName: "Software Architect",
    avatar: "🏗️",
    defaultChannels: ["general", "architecture"],
  },
  {
    identifier: "data-architect",
    displayName: "Data Architect",
    avatar: "📊",
    defaultChannels: ["general", "architecture"],
  },
  {
    identifier: "security-architect",
    displayName: "Security Architect",
    avatar: "🔐",
    defaultChannels: ["general", "security", "architecture"],
  },
  {
    identifier: "cloud-architect",
    displayName: "Cloud Architect",
    avatar: "☁️",
    defaultChannels: ["general", "devops", "architecture"],
  },
  {
    identifier: "mobile-lead",
    displayName: "Mobile Lead",
    avatar: "📱",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "platform-lead",
    displayName: "Platform Lead",
    avatar: "🔧",
    defaultChannels: ["general", "engineering", "devops"],
  },
  {
    identifier: "qa-lead",
    displayName: "QA Lead",
    avatar: "🐛",
    defaultChannels: ["general", "qa"],
  },
  {
    identifier: "devops-lead",
    displayName: "DevOps Lead",
    avatar: "🔧",
    defaultChannels: ["general", "devops"],
  },
  {
    identifier: "sre-lead",
    displayName: "SRE Lead",
    avatar: "🚨",
    defaultChannels: ["general", "devops"],
  },
  {
    identifier: "data-lead",
    displayName: "Data Lead",
    avatar: "📈",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "ml-lead",
    displayName: "ML Lead",
    avatar: "🧠",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "infrastructure-lead",
    displayName: "Infrastructure Lead",
    avatar: "🏭",
    defaultChannels: ["general", "devops"],
  },

  // Managers (5)
  {
    identifier: "engineering-manager",
    displayName: "Engineering Manager",
    avatar: "📋",
    defaultChannels: ["general", "engineering", "standups"],
  },
  {
    identifier: "product-manager",
    displayName: "Product Manager",
    avatar: "📝",
    defaultChannels: ["general", "product", "standups"],
  },
  {
    identifier: "project-manager",
    displayName: "Project Manager",
    avatar: "📅",
    defaultChannels: ["general", "standups"],
  },
  {
    identifier: "release-manager",
    displayName: "Release Manager",
    avatar: "🚢",
    defaultChannels: ["general", "devops"],
  },
  {
    identifier: "scrum-master",
    displayName: "Scrum Master",
    avatar: "🏃",
    defaultChannels: ["general", "standups"],
  },

  // Senior Engineers (40)
  {
    identifier: "backend-engineer-1",
    displayName: "Backend Engineer",
    avatar: "💻",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "backend-engineer-2",
    displayName: "Backend Engineer",
    avatar: "💻",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "backend-engineer-3",
    displayName: "Backend Engineer",
    avatar: "💻",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "backend-engineer-4",
    displayName: "Backend Engineer",
    avatar: "💻",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "backend-engineer-5",
    displayName: "Backend Engineer",
    avatar: "💻",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "frontend-engineer-1",
    displayName: "Frontend Engineer",
    avatar: "🎨",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "frontend-engineer-2",
    displayName: "Frontend Engineer",
    avatar: "🎨",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "frontend-engineer-3",
    displayName: "Frontend Engineer",
    avatar: "🎨",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "frontend-engineer-4",
    displayName: "Frontend Engineer",
    avatar: "🎨",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "frontend-engineer-5",
    displayName: "Frontend Engineer",
    avatar: "🎨",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "fullstack-engineer-1",
    displayName: "Fullstack Engineer",
    avatar: "🔄",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "fullstack-engineer-2",
    displayName: "Fullstack Engineer",
    avatar: "🔄",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "fullstack-engineer-3",
    displayName: "Fullstack Engineer",
    avatar: "🔄",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "fullstack-engineer-4",
    displayName: "Fullstack Engineer",
    avatar: "🔄",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "fullstack-engineer-5",
    displayName: "Fullstack Engineer",
    avatar: "🔄",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "mobile-engineer-1",
    displayName: "Mobile Engineer",
    avatar: "📱",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "mobile-engineer-2",
    displayName: "Mobile Engineer",
    avatar: "📱",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "mobile-engineer-3",
    displayName: "Mobile Engineer",
    avatar: "📱",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "devops-engineer",
    displayName: "DevOps Engineer",
    avatar: "🔧",
    defaultChannels: ["general", "devops"],
  },
  {
    identifier: "devops-engineer-2",
    displayName: "DevOps Engineer",
    avatar: "🔧",
    defaultChannels: ["general", "devops"],
  },
  {
    identifier: "devops-engineer-3",
    displayName: "DevOps Engineer",
    avatar: "🔧",
    defaultChannels: ["general", "devops"],
  },
  {
    identifier: "sre-engineer-1",
    displayName: "SRE Engineer",
    avatar: "🚨",
    defaultChannels: ["general", "devops"],
  },
  {
    identifier: "sre-engineer-2",
    displayName: "SRE Engineer",
    avatar: "🚨",
    defaultChannels: ["general", "devops"],
  },
  {
    identifier: "security-engineer-1",
    displayName: "Security Engineer",
    avatar: "🔒",
    defaultChannels: ["general", "security"],
  },
  {
    identifier: "security-engineer-2",
    displayName: "Security Engineer",
    avatar: "🔒",
    defaultChannels: ["general", "security"],
  },
  {
    identifier: "security-engineer-3",
    displayName: "Security Engineer",
    avatar: "🔒",
    defaultChannels: ["general", "security"],
  },
  {
    identifier: "data-engineer-1",
    displayName: "Data Engineer",
    avatar: "📊",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "data-engineer-2",
    displayName: "Data Engineer",
    avatar: "📊",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "data-engineer-3",
    displayName: "Data Engineer",
    avatar: "📊",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "ml-engineer-1",
    displayName: "ML Engineer",
    avatar: "🧠",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "ml-engineer-2",
    displayName: "ML Engineer",
    avatar: "🧠",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "qa-engineer-1",
    displayName: "QA Engineer",
    avatar: "🐛",
    defaultChannels: ["general", "qa"],
  },
  {
    identifier: "qa-engineer-2",
    displayName: "QA Engineer",
    avatar: "🐛",
    defaultChannels: ["general", "qa"],
  },
  {
    identifier: "qa-engineer-3",
    displayName: "QA Engineer",
    avatar: "🐛",
    defaultChannels: ["general", "qa"],
  },
  {
    identifier: "qa-engineer-4",
    displayName: "QA Engineer",
    avatar: "🐛",
    defaultChannels: ["general", "qa"],
  },
  {
    identifier: "qa-engineer-5",
    displayName: "QA Engineer",
    avatar: "🐛",
    defaultChannels: ["general", "qa"],
  },
  {
    identifier: "automation-engineer-1",
    displayName: "Automation Engineer",
    avatar: "🤖",
    defaultChannels: ["general", "qa"],
  },
  {
    identifier: "automation-engineer-2",
    displayName: "Automation Engineer",
    avatar: "🤖",
    defaultChannels: ["general", "qa"],
  },
  {
    identifier: "performance-engineer",
    displayName: "Performance Engineer",
    avatar: "⚡",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "database-engineer",
    displayName: "Database Engineer",
    avatar: "🗄️",
    defaultChannels: ["general", "engineering"],
  },

  // Specialists (41)
  {
    identifier: "ui-designer-1",
    displayName: "UI Designer",
    avatar: "🎨",
    defaultChannels: ["general", "product"],
  },
  {
    identifier: "ui-designer-2",
    displayName: "UI Designer",
    avatar: "🎨",
    defaultChannels: ["general", "product"],
  },
  {
    identifier: "ux-designer-1",
    displayName: "UX Designer",
    avatar: "🧩",
    defaultChannels: ["general", "product"],
  },
  {
    identifier: "ux-designer-2",
    displayName: "UX Designer",
    avatar: "🧩",
    defaultChannels: ["general", "product"],
  },
  {
    identifier: "ux-researcher",
    displayName: "UX Researcher",
    avatar: "🔍",
    defaultChannels: ["general", "product"],
  },
  {
    identifier: "product-owner",
    displayName: "Product Owner",
    avatar: "🎯",
    defaultChannels: ["general", "product"],
  },
  {
    identifier: "business-analyst",
    displayName: "Business Analyst",
    avatar: "📈",
    defaultChannels: ["general", "product"],
  },
  {
    identifier: "technical-writer-1",
    displayName: "Technical Writer",
    avatar: "📝",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "technical-writer-2",
    displayName: "Technical Writer",
    avatar: "📝",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "developer-advocate",
    displayName: "Developer Advocate",
    avatar: "🎤",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "solutions-architect",
    displayName: "Solutions Architect",
    avatar: "🏛️",
    defaultChannels: ["general", "architecture"],
  },
  {
    identifier: "integration-specialist",
    displayName: "Integration Specialist",
    avatar: "🔗",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "api-specialist",
    displayName: "API Specialist",
    avatar: "🔌",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "kubernetes-specialist",
    displayName: "Kubernetes Specialist",
    avatar: "☸️",
    defaultChannels: ["general", "devops"],
  },
  {
    identifier: "terraform-specialist",
    displayName: "Terraform Specialist",
    avatar: "🏗️",
    defaultChannels: ["general", "devops"],
  },
  {
    identifier: "aws-specialist",
    displayName: "AWS Specialist",
    avatar: "☁️",
    defaultChannels: ["general", "devops"],
  },
  {
    identifier: "gcp-specialist",
    displayName: "GCP Specialist",
    avatar: "☁️",
    defaultChannels: ["general", "devops"],
  },
  {
    identifier: "azure-specialist",
    displayName: "Azure Specialist",
    avatar: "☁️",
    defaultChannels: ["general", "devops"],
  },
  {
    identifier: "docker-specialist",
    displayName: "Docker Specialist",
    avatar: "🐳",
    defaultChannels: ["general", "devops"],
  },
  {
    identifier: "networking-specialist",
    displayName: "Networking Specialist",
    avatar: "🌐",
    defaultChannels: ["general", "devops"],
  },
  {
    identifier: "monitoring-specialist",
    displayName: "Monitoring Specialist",
    avatar: "📡",
    defaultChannels: ["general", "devops"],
  },
  {
    identifier: "logging-specialist",
    displayName: "Logging Specialist",
    avatar: "📋",
    defaultChannels: ["general", "devops"],
  },
  {
    identifier: "observability-specialist",
    displayName: "Observability Specialist",
    avatar: "👁️",
    defaultChannels: ["general", "devops"],
  },
  {
    identifier: "redis-specialist",
    displayName: "Redis Specialist",
    avatar: "🔴",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "postgresql-specialist",
    displayName: "PostgreSQL Specialist",
    avatar: "🐘",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "mongodb-specialist",
    displayName: "MongoDB Specialist",
    avatar: "🍃",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "elasticsearch-specialist",
    displayName: "ElasticSearch Specialist",
    avatar: "🔎",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "kafka-specialist",
    displayName: "Kafka Specialist",
    avatar: "📨",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "graphql-specialist",
    displayName: "GraphQL Specialist",
    avatar: "◼️",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "react-specialist",
    displayName: "React Specialist",
    avatar: "⚛️",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "vue-specialist",
    displayName: "Vue Specialist",
    avatar: "💚",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "angular-specialist",
    displayName: "Angular Specialist",
    avatar: "🅰️",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "node-specialist",
    displayName: "Node.js Specialist",
    avatar: "💚",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "python-specialist",
    displayName: "Python Specialist",
    avatar: "🐍",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "go-specialist",
    displayName: "Go Specialist",
    avatar: "🔵",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "rust-specialist",
    displayName: "Rust Specialist",
    avatar: "🦀",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "typescript-specialist",
    displayName: "TypeScript Specialist",
    avatar: "🔷",
    defaultChannels: ["general", "engineering"],
  },
  {
    identifier: "accessibility-specialist",
    displayName: "Accessibility Specialist",
    avatar: "♿",
    defaultChannels: ["general", "product"],
  },
  {
    identifier: "i18n-specialist",
    displayName: "i18n Specialist",
    avatar: "🌍",
    defaultChannels: ["general", "product"],
  },
  {
    identifier: "seo-specialist",
    displayName: "SEO Specialist",
    avatar: "🔍",
    defaultChannels: ["general", "product"],
  },
  {
    identifier: "autonomous-agent-orchestrator",
    displayName: "Orchestrator",
    avatar: "🎭",
    defaultChannels: ["general", "engineering", "architecture", "standups"],
  },
];

// Total: 5 + 5 + 15 + 5 + 40 + 41 = 111 agents ✅
