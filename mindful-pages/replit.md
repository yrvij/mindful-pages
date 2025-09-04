# MindfulPages - AI-Powered Journaling Companion

## Overview

MindfulPages is an AI-powered journaling companion designed to help users develop consistent journaling habits through empathetic prompts, private sentiment analysis, and personalized insights. The application addresses "blank page anxiety" by providing contextual writing prompts and helps users discover meaningful patterns in their emotional journey through intelligent analysis of their entries.

The system is built as a full-stack web application with a React frontend and Express.js backend, featuring real-time sentiment analysis, mood tracking, and weekly insight generation to transform journaling from simple event logging into a tool for personal growth and self-reflection.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript for type safety and modern development
- **UI Library**: Radix UI components with shadcn/ui styling system for consistent, accessible interface
- **Styling**: Tailwind CSS with custom CSS variables for theming and responsive design
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture  
- **Runtime**: Node.js with Express.js framework for RESTful API endpoints
- **Language**: TypeScript with ESM modules for modern JavaScript features
- **Database ORM**: Drizzle ORM with schema-first approach for type-safe database operations
- **Authentication**: Replit Auth integration with session-based authentication using PostgreSQL session store
- **API Design**: RESTful endpoints with structured error handling and request logging middleware

### Database Design
- **Primary Database**: PostgreSQL with Neon serverless hosting for scalability
- **Schema Management**: Drizzle Kit for database migrations and schema versioning
- **Core Tables**:
  - Users table with streak tracking and writing statistics
  - Journal entries with content, sentiment analysis, and metadata
  - AI prompts system for contextual writing suggestions
  - Weekly insights for pattern recognition and growth tracking
  - Sessions table for authentication state management

### AI Integration
- **Provider**: OpenAI GPT-5 for advanced language understanding and generation
- **Sentiment Analysis**: Real-time mood detection and confidence scoring from journal content
- **Contextual Prompts**: Dynamic prompt generation based on user history and emotional patterns  
- **Insight Generation**: Weekly analysis of themes, patterns, and personalized recommendations
- **Privacy Focus**: All AI processing respects user privacy with secure API communication

### Authentication & Security
- **Authentication Flow**: Replit OIDC integration with OpenID Connect standards
- **Session Management**: PostgreSQL-backed sessions with configurable TTL and secure cookies
- **Authorization**: Route-level protection with user context injection
- **Privacy Design**: User data isolation and secure credential handling

### Development & Deployment
- **Development**: Hot module replacement with Vite development server
- **Production Build**: Optimized bundling with esbuild for server code and Vite for client
- **Environment**: Replit-optimized with development tooling integration
- **Asset Management**: Structured asset organization with build-time optimization

## External Dependencies

### Core Infrastructure
- **Neon Database**: PostgreSQL hosting with serverless architecture and connection pooling
- **OpenAI API**: GPT-5 integration for sentiment analysis, prompt generation, and insight creation
- **Replit Authentication**: OIDC-based user authentication and session management

### UI & Styling
- **Radix UI**: Accessible component primitives for complex interactions
- **Tailwind CSS**: Utility-first styling with custom design system integration
- **Lucide Icons**: Consistent iconography throughout the application
- **Google Fonts**: Custom typography with Inter and Crimson Text font families

### Development Tools
- **TypeScript**: Type safety across frontend and backend codebases
- **Drizzle Kit**: Database schema management and migration tooling
- **TanStack Query**: Server state synchronization and caching layer
- **Vite Plugins**: Development enhancement with error overlays and debugging tools

### Third-Party Libraries
- **Date-fns**: Date manipulation and formatting utilities
- **Zod**: Runtime type validation and schema parsing
- **Class Variance Authority**: Type-safe CSS class composition
- **React Hook Form**: Form state management with validation integration