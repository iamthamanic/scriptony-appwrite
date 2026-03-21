-- Initial database setup for Scriptony
-- This script runs when PostgreSQL container starts for the first time

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS public;

-- Optional: the local-dev compose profile may run a GraphQL engine container against this DB.
-- Production data lives in Appwrite; do not treat this Postgres as the app source of truth.
