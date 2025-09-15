# 🧠 Project Spirits - AI-Powered Project Management

The Project Spirit system transforms your NamOS projects into intelligent, self-aware entities with their own AI assistants. Each project gets a dedicated "spirit" that learns, adapts, and helps manage the project lifecycle.

## ✨ What Are Project Spirits?

Project Spirits are AI-powered assistants that:

- **🎯 Understand Context**: Know your project goals, client preferences, and team dynamics
- **📊 Generate Insights**: Analyze project data to surface risks, opportunities, and patterns
- **💬 Communicate Naturally**: Chat interface for project questions and guidance
- **🔄 Learn & Adapt**: Evolve based on project patterns and feedback
- **🛤️ Track Progress**: Monitor project stages and suggest next steps

## 🏗️ Architecture Overview

```
Project Spirit System
├── 🧠 AI Core (src/lib/ai.ts)
│   ├── OpenAI Integration
│   ├── Context Analysis
│   └── Response Generation
├── 📊 Data Layer (database/project-spirits-schema.sql)
│   ├── project_spirits
│   ├── spirit_conversations
│   ├── spirit_insights
│   └── spirit_patterns
├── ⚛️ React Components
│   ├── SpiritChat.tsx
│   ├── SpiritInsights.tsx
│   └── ProjectSidebar.tsx (enhanced)
└── 🔗 Hooks & Context
    ├── SpiritContext.tsx
    └── useSupabase.ts (extended)
```

## 🚀 Getting Started

### 1. Database Setup

Run the setup script to create the necessary database tables:

```bash


```

Or manually apply the schema:

```bash
supabase db push
psql -f database/project-spirits-schema.sql
```

### 2. Environment Configuration

Add your OpenAI API key to your environment:

```bash
# .env.local
REACT_APP_OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Start Using Spirits

1. Navigate to any project in your NamOS dashboard
2. Open the project sidebar
3. Click "Create Project Spirit" in the Project Spirit section
4. Start chatting with your new AI assistant!

## 🎭 Spirit Personalities

Each spirit has a configurable personality based on:

### Tone Options
- **Professional**: Formal, structured communication for enterprise clients
- **Casual**: Friendly, relaxed tone for internal or startup projects
- **Creative**: Inspirational, idea-focused for design/creative work
- **Technical**: Precise, detail-oriented for development projects
- **Consultative**: Advisory, strategic guidance for complex projects

### Focus Areas
- Task Management
- Timeline Tracking
- Client Communication
- Risk Assessment
- Resource Planning
- Quality Assurance

## 🛤️ Project Path Stages

Spirits automatically track and help manage project progression through stages:

1. **Discovery** (5 days avg)
   - Requirements gathering
   - Stakeholder identification
   - Success metrics definition

2. **Planning** (3 days avg)
   - Detailed project planning
   - Resource allocation
   - Timeline creation

3. **Design** (7 days avg)
   - Wireframes and mockups
   - Prototypes
   - Client approval

4. **Development** (14 days avg)
   - Core functionality
   - Feature implementation
   - Integration work

5. **Testing** (5 days avg)
   - Quality assurance
   - Bug fixes
   - Performance optimization

6. **Review** (3 days avg)
   - Client review
   - Feedback incorporation
   - Final adjustments

7. **Delivery** (2 days avg)
   - Final deliverables
   - Deployment
   - Client handover

8. **Maintenance** (30+ days)
   - Ongoing support
   - Updates and improvements

## 💡 AI Insights Types

Spirits generate various types of insights:

### 🎯 Task Suggestions
- Recommended next actions
- Missing deliverables
- Optimization opportunities

### ⚠️ Risk Alerts
- Overdue tasks
- Budget concerns
- Timeline risks

### 🚀 Opportunities
- Upselling possibilities
- Process improvements
- Client expansion

### 📈 Patterns
- Workflow optimizations
- Resource utilization
- Communication patterns

### 👥 Client Updates
- Status report suggestions
- Communication recommendations
- Relationship insights

## 🔧 Technical Implementation

### Core Components

#### ProjectSpirit Interface
```typescript
interface ProjectSpirit {
  id: string;
  project_id: string;
  name: string;
  personality: {
    tone: 'professional' | 'casual' | 'creative' | 'technical' | 'consultative';
    focus_areas: string[];
    communication_style: string;
    expertise_level: 'junior' | 'mid' | 'senior' | 'expert';
  };
  path_stage: 'discovery' | 'planning' | 'design' | 'development' | 'testing' | 'review' | 'delivery' | 'maintenance';
  path_progress: number;
  client_profile: ClientProfile;
  // ... additional fields
}
```

#### AI Service
```typescript
class ProjectSpiritAI {
  async generateSpiritResponse(spirit, project, message, context): Promise<string>
  async generateProjectInsights(spirit, project, tasks, timeEntries): Promise<SpiritInsight[]>
  async detectPathStage(project, tasks, timeEntries): Promise<PathStageResult>
}
```

### Database Schema

The system uses 5 main tables:

- `project_spirits`: Core spirit configuration
- `spirit_conversations`: Chat history
- `spirit_insights`: AI-generated insights
- `spirit_patterns`: Learned patterns
- `path_stages`: Stage definitions

### React Integration

```typescript
// Using the Spirit system in components
const { spirit } = useProjectSpirit(projectId);
const { conversations } = useSpiritConversations(spiritId);
const { insights } = useSpiritInsights(spiritId);
```

## 🎨 UI/UX Features

### Project Sidebar Integration
- Spirit info card with personality and progress
- One-click chat access
- Real-time insights display
- Path stage visualization

### Chat Interface
- Natural language conversations
- Context-aware responses
- Message history
- Typing indicators

### Insights Dashboard
- Categorized insights with confidence scores
- Read/unread status
- Time-based organization
- Action buttons for insights

## 🔒 Security & Privacy

- All AI processing uses your OpenAI API key
- Conversations stored securely in Supabase
- Row-level security policies applied
- No data shared with third parties

## 🚀 Future Enhancements

### Planned Features
- **Multi-language Support**: Spirits that communicate in different languages
- **Voice Integration**: Voice chat with spirits
- **Automated Actions**: Spirits that can create tasks, send emails, etc.
- **Cross-project Learning**: Spirits that learn from multiple projects
- **Client Portals**: Client-facing spirit interactions
- **Integration Hub**: Connect with Slack, email, calendar, etc.

### Advanced AI Features
- **Predictive Analytics**: Forecast project outcomes
- **Resource Optimization**: Suggest optimal team allocation
- **Risk Modeling**: Advanced risk assessment and mitigation
- **Performance Benchmarking**: Compare against similar projects

## 🤝 Contributing

The Project Spirit system is designed to be extensible:

1. **Custom Personalities**: Add new personality types in `src/lib/ai.ts`
2. **New Insight Types**: Extend the insight generation system
3. **Additional Integrations**: Connect with external tools and services
4. **UI Enhancements**: Improve the chat and insights interfaces

## 📚 API Reference

### Hooks

#### `useProjectSpirit(projectId: string)`
Returns the spirit for a specific project.

#### `useSpiritConversations(spiritId: string)`
Returns conversation history for a spirit.

#### `useSpiritInsights(spiritId: string)`
Returns AI-generated insights for a spirit.

#### `useSpiritOperations()`
Provides CRUD operations for spirits.

### AI Functions

#### `spiritAI.generateSpiritResponse()`
Generate contextual responses to user messages.

#### `spiritAI.generateProjectInsights()`
Analyze project data and generate actionable insights.

#### `spiritAI.detectPathStage()`
Automatically detect current project stage.

## 🎯 Best Practices

### Spirit Configuration
- Choose personality tone based on client type
- Set focus areas relevant to project needs
- Update client profile as you learn more

### Conversation Management
- Ask specific questions for better responses
- Provide context when discussing complex topics
- Review insights regularly and mark as read

### Project Integration
- Keep project data updated for better AI insights
- Use consistent task naming and descriptions
- Log time entries regularly for accurate analysis

---

**The Project Spirit system represents the next evolution of project management - where AI doesn't just assist, but truly understands and adapts to your unique project needs.**

*Built with ❤️ for the NAM Studio ecosystem*
