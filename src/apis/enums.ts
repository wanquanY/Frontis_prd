/**
 * Shared API enums.
 * Values follow backend UPPER_SNAKE_CASE definitions.
 */
export enum EnableStatus {
  Active = "active",
  Disabled = "disabled",
}

export enum AnalysisStatus {
  Pending = "pending",
  Analyzing = "analyzing",
  Completed = "completed",
  Failed = "failed",
}

export enum AgentType {
  Agent = "agent",
  AIApp = "ai_app",
}

export enum ExecutionMode {
  FrameworkChat = "framework_chat",
}

export enum SpaceDataType {
  File = "file",
  Webpage = "webpage",
  Database = "database",
  API = "api",
  Spreadsheet = "spreadsheet",
  Storage = "storage",
}

export enum SpaceDataSourceType {
  Upload = "upload",
  Url = "url",
  MySQL = "mysql",
  PostgreSQL = "postgresql",
  MongoDB = "mongodb",
  Rest = "rest",
  GraphQL = "graphql",
  GoogleSheets = "google_sheets",
  Airtable = "airtable",
  S3 = "s3",
  OSS = "oss",
  COS = "cos",
}
