# MindfulPages - Design Document

## Project Overview

**MindfulPages** is an AI-powered journaling companion designed to help users develop consistent journaling habits through empathetic prompts, private sentiment analysis, and personalized insights. The application transforms journaling from simple event logging into a tool for personal growth and self-reflection.

### Core Mission
Address "blank page anxiety" by providing contextual writing prompts and help users discover meaningful patterns in their emotional journey through intelligent analysis of their entries.

---

## Design Philosophy

### User Experience Principles
- **Simplicity First**: Clean, intuitive interface that doesn't overwhelm users
- **Empathetic AI**: AI interactions feel warm and supportive, not clinical or robotic  
- **Privacy by Design**: All personal data remains secure with transparent AI processing
- **Growth Oriented**: Focus on personal development rather than just data collection
- **Accessible**: Easy-to-read visualizations with emojis instead of technical charts

### Visual Design Language
- **Modern Minimalism**: Clean typography with generous whitespace
- **Warm Color Palette**: Calming blues and earth tones to promote reflection
- **Emoji-Driven Insights**: 😊😐🙁 mood tracking instead of numerical scores
- **Responsive Layout**: Seamless experience across desktop and mobile devices

---

## Technical Architecture

### Frontend Stack
```
React 18 + TypeScript
```

### Backend Stack  
```
Node.js + Express.js
├── Database: PostgreSQL (Neon serverless hosting)
├── Authentication: Replit Auth (OIDC integration)
├── AI Provider: Google Gemini AI for analysis
└── Session Management: PostgreSQL-backed sessions
```

### Database Schema
```sql
-- Core Tables
users (id, email, streak_data, writing_stats)
journal_entries (id, user_id, content, sentiment, themes, mood)
ai_prompts (id, user_id, prompt_text, context, is_used)
weekly_insights (id, user_id, summary, themes, mood_trend)

-- Relationships
user -> journal_entries (1:many)
user -> ai_prompts (1:many) 
user -> weekly_insights (1:many)
```

### AI Integration Architecture
```
Gemini AI Pipeline
├── Sentiment Analysis: Real-time emotion detection
├── Theme Extraction: Pattern recognition across entries  
├── Prompt Generation: Contextual writing suggestions
├── Weekly Insights: Growth pattern analysis
└── Mood Classification: Emotional state categorization
```

---

## Feature Specifications

### 🎯 Core Features

#### 1. AI-Powered Daily Prompts
- **Dynamic Generation**: Unique prompts created based on user history
- **Contextual Relevance**: Prompts adapt to recent mood patterns and themes
- **Conversational Tone**: Short, friendly questions (1-2 sentences max)
- **Fallback System**: Curated prompts when AI is unavailable

**Example Prompts:**
- "What small win from this week deserves more celebration?"
- "If your future self could give you one piece of advice right now, what would it be?"

#### 2. Intelligent Sentiment Analysis
- **Real-Time Processing**: Immediate mood detection as users write
- **Multi-Dimensional**: Sentiment score, mood label, and confidence level
- **Visual Feedback**: Emoji-based mood indicators instead of numbers
- **Privacy Focused**: Analysis happens securely without storing raw content

#### 3. Theme Discovery Engine
- **Pattern Recognition**: AI identifies recurring topics and concerns
- **Cross-Entry Analysis**: Themes emerge from multiple journal sessions
- **Visual Clustering**: Themes displayed as readable tags and counts
- **Growth Tracking**: Monitor how themes evolve over time

#### 4. Weekly Insight Generation
- **Automated Summaries**: AI-generated reflections on the week's entries
- **Trend Analysis**: Mood progression and pattern recognition
- **Actionable Recommendations**: Personalized suggestions for growth
- **Historical Context**: Compare current week to previous periods

### 📊 Analytics & Visualizations

#### Mood Tracking Dashboard
- **Emoji Visualization**: 😊😐🙁 instead of technical sentiment scores
- **Weekly View**: Days of the week with mood indicators
- **Entry Count**: Number of journal entries per mood state
- **Accessible Labels**: "Great day" instead of "0.8 sentiment score"

#### Writing Statistics
- **Streak Tracking**: Current and longest writing streaks
- **Word Count**: Total words written across all entries
- **Entry Count**: Total number of completed journal entries
- **Progress Visualization**: Clean, motivating progress indicators

---

## User Journey & Flow

### New User Onboarding
1. **Welcome Screen**: Replit Auth integration for seamless signup
2. **First Prompt**: AI generates personalized welcome question
3. **Writing Interface**: Guided introduction to the editor
4. **Initial Analysis**: First sentiment analysis with explanation
5. **Dashboard Tour**: Overview of tracking and insights features

### Daily Usage Flow
```
User opens app
    ↓
Dashboard shows current streak & today's prompt
    ↓
User clicks "Write" → AI-generated contextual prompt
    ↓
Writing session with real-time sentiment feedback
    ↓
Entry saved → Themes extracted → Stats updated
    ↓
Weekly insight generation (if end of week)
```

### Long-term Engagement
- **Weekly Insights**: Delivered every Sunday with growth patterns
- **Theme Evolution**: Track how personal focus areas change over time  
- **Milestone Celebrations**: Achievement badges for writing streaks
- **Reflection Prompts**: Quarterly deep-reflection guided sessions

---

## AI Integration Details

### Gemini AI Implementation
```typescript
// Core AI Functions
analyzeSentiment(content: string) → {score, label, mood, confidence}
extractThemes(entries: Entry[]) → string[]
generateDailyPrompt(userHistory, mood) → string
createWeeklyInsight(weekEntries) → {summary, trends, recommendations}
```

### Prompt Engineering Strategy
- **Context-Aware**: Prompts consider recent entries and mood patterns
- **Empathetic Tone**: Questions feel like supportive friend check-ins
- **Growth-Oriented**: Focus on self-reflection and personal development
- **Culturally Sensitive**: Inclusive language that respects diverse backgrounds

### Privacy & Security
- **Data Minimization**: Only necessary content sent to AI services
- **Secure Transmission**: All API calls use encrypted connections
- **No Data Retention**: AI providers don't store user content
- **Local Processing**: Fallback systems work without external AI calls

---

## Future Enhancements

- **Mood Correlations**: Identify what activities improve mood
- **Sleep/Weather Integration**: External factor impact analysis  
- **Photo Journaling**: Visual memory integration with sentiment analysis
- **Export Capabilities**: PDF/DOCX export of journal entries and insights
- **Anonymous Sharing**: Share insights without revealing personal details
- **Community Challenges**: Group journaling prompts and themes
- **Mentor Matching**: Connect users with similar growth journeys
- **Group Insights**: Aggregate anonymous trends for community learning

---

*Last Updated: September 4, 2025*  
*Version: 1.0*  
*Author: Yash Vij*
