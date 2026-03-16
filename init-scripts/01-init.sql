-- Initial database setup for Scriptony
-- This script runs when PostgreSQL container starts for the first time

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS public;

-- Note: Hasura will create its own metadata schema automatically
-- Additional migrations should be handled via Hasura CLI or migration files
