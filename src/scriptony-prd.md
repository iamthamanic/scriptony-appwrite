# Scriptony - Product Requirements Document (PRD)

**Version:** 1.0  
**Last Updated:** January 13, 2026  
**Product:** Scriptony - Professional Scriptwriting Platform

---

## 1. Executive Summary

**Scriptony** is a professional scriptwriting platform designed for screenwriters and authors. The platform provides specialized project structures for both Film and Book projects, featuring an advanced AI chat system, a sophisticated StoryBeat timeline system, and a CapCut-inspired Playbook editor with dynamic track management.

### Core Value Proposition
- **Dual Project Types:** Specialized workflows for Film (screenplay) and Book (novel) projects
- **AI-Powered Writing Assistant:** Context-aware chat system for creative support
- **Visual Story Structure:** Timeline-based beat system for plot planning
- **Professional Playbook Editor:** Multi-track timeline editor with ripple editing
- **Performance-First:** "Übertrieben schnell" with automatic SLA monitoring

---

## 2. Design System

### 2.1 Brand Identity
- **Primary Color:** `#6E59A5` (Violet)
- **Design Philosophy:** Professional, modern, performance-focused
- **Visual Style:** Clean, minimalist interface with violet accents

### 2.2 Color Palette
```css
--primary-violet: #6E59A5
--background: Dark theme optimized
--text: High contrast for readability
```

### 2.3 Typography
- Defined in `/styles/globals.css`
- Tailwind CSS v4 for utility classes
- System font stack for performance

---

## 3. Project Management System

### 3.1 Project Types

#### 3.1.1 Film Projects
**Structure:**
- Acts (configurable count)
- Sequences per Act
- Scenes per Sequence
- Traditional screenplay hierarchy

**Duration Calculation:**
- Based on scene count and average scene length
- Industry standard: ~1 page = 1 minute screen time

**Use Cases:**
- Feature films
- Short films
- TV episodes
- Web series

#### 3.1.2 Book Projects
**Structure:**
- Acts (configurable count)
- Chapters per Act
- Narrative prose structure

**Duration Calculation:**
- Based on total word count across all Acts
- Configurable reading speed (WPM - Words Per Minute)
- Dynamic calculation: `totalDuration = totalWordCount / wordsPerMinute`
- WPM configurable in Project Settings

**Use Cases:**
- Novels
- Novellas
- Short stories
- Non-fiction books

### 3.2 Project Settings
**Configurable Parameters:**
- Project name
- Project type (Film/Book)
- Number of Acts
- Reading speed (WPM for books)
- Story structure template
- Beat generation settings

---

## 4. StoryBeat System

### 4.1 Overview
The StoryBeat system provides visual story structure planning through a timeline-based interface. Beats represent key story moments, plot points, and narrative milestones.

### 4.2 Beat Templates

#### 4.2.1 Available Templates
1. **Save the Cat (15 Beats)**
   - Opening Image
   - Theme Stated
   - Set-Up
   - Catalyst
   - Debate
   - Break into Two
   - B Story
   - Fun and Games
   - Midpoint
   - Bad Guys Close In
   - All Is Lost
   - Dark Night of the Soul
   - Break into Three
   - Finale
   - Final Image

2. **Three-Act Structure**
   - Act 1: Setup
   - Plot Point 1
   - Act 2A: Rising Action
   - Midpoint
   - Act 2B: Complications
   - Plot Point 2
   - Act 3: Resolution

3. **Hero's Journey**
   - Ordinary World
   - Call to Adventure
   - Refusal of the Call
   - Meeting the Mentor
   - Crossing the Threshold
   - Tests, Allies, Enemies
   - Approach to Inmost Cave
   - Ordeal
   - Reward
   - The Road Back
   - Resurrection
   - Return with Elixir

4. **Custom Templates**
   - User-defined beat structures
   - Saved to project

### 4.3 Beat Generation
**Automatic Beat Placement:**
- Beats are automatically distributed across timeline based on template
- Percentage-based positioning (0-100%)
- Calculated positions based on story structure theory
- Works for both Film and Book projects

**Manual Beat Creation:**
- Users can add custom beats
- Drag-and-drop positioning
- Label editing

### 4.4 Beat Display Rules
**Critical Rule:** Beats are ONLY displayed in Timeline view
- **NOT** in Act/Sequence/Scene editors
- **NOT** in writing interface
- **ONLY** in Playbook Timeline

### 4.5 Beat Management
**Features:**
- Add/Delete beats
- Edit beat labels
- Resize beat duration (CapCut-style ripple editing)
- Snap-to-grid (magnetic snapping)
- Visual timeline representation

---

## 5. Playbook System (Timeline Editor)

### 5.1 Overview
A professional multi-track timeline editor inspired by CapCut and DaVinci Resolve, providing visual project management and beat editing.

### 5.2 Core Features

#### 5.2.1 Timeline Visualization
- Horizontal timeline spanning full project duration
- Time ruler with dynamic scaling
- Playhead with current time display
- Zoom controls (10%-500%)
- Pan and scroll navigation

#### 5.2.2 Multi-Track System
**Track Types:**
- Beat Track (Story structure beats)
- Scene Track (Scene markers)
- Character Track (Character appearances)
- Custom Tracks (User-defined)

**Track Management:**
- Add/Remove tracks
- Reorder tracks (drag-and-drop)
- Show/Hide tracks
- Dynamic track heights (resizable)

#### 5.2.3 Track Height Resizing (CapCut-Style)
**Implementation:**
- Each track has resizable height
- Drag handle at bottom of each track
- Min height: 40px
- Max height: 300px
- Smooth resize interaction
- **localStorage persistence** - Heights saved per project

**User Experience:**
- Hover to reveal resize handle
- Cursor changes to `ns-resize`
- Visual feedback during resize
- Heights preserved across sessions

#### 5.2.4 Fullscreen Mode
**Features:**
- Dedicated fullscreen button in Timeline toolbar
- Expands Playbook to full viewport
- Hides navigation and sidebars
- ESC key to exit
- Native browser fullscreen API
- Preserved state during fullscreen

**Benefits:**
- Maximum timeline visibility
- Distraction-free editing
- Better for long projects
- Professional editing experience

### 5.3 Beat Editing (Ripple Editing)

#### 5.3.1 CapCut-Style Ripple Editing
**Behavior:**
- **RIGHT Handle Resize:** Ripple editing enabled
  - All beats to the right shift automatically
  - Maintains gapless timeline
  - No overlaps or gaps created
  
- **LEFT Handle Resize:** No ripple
  - Only the beat itself changes
  - Hard stop at adjacent beat
  - Standard video editor behavior

**Visual Feedback:**
- Resize handles on hover
- Cursor changes (ew-resize)
- Real-time preview during drag
- Snap indicators (when magnet enabled)

#### 5.3.2 Magnetic Snapping System
**Snap Targets:**
- Other beat boundaries
- Playhead position
- Track markers
- Grid lines (time intervals)

**Snap Threshold:**
- Configurable snap distance
- Visual snap indicators
- Toggle on/off with magnet button
- Works during resize and drag

**Note:** Magnet controls ONLY snapping behavior, NOT ripple behavior. Ripple is always active for right handle.

#### 5.3.3 Beat Constraints
- **Minimum Duration:** 1 second
- **Bounds:** Cannot exceed timeline duration (0-100%)
- **No Overlaps:** Hard stops at adjacent beats
- **Gapless:** Ripple editing maintains continuity

### 5.4 Playhead & Playback
**Features:**
- Draggable playhead
- Click-to-seek on timeline
- Current time display (MM:SS format)
- Snap-to-beat option
- Keyboard shortcuts (Space to play/pause)

### 5.5 Timeline Controls
**Toolbar:**
- Play/Pause button
- Zoom slider (10%-500%)
- Fullscreen toggle
- Magnet snap toggle
- Add beat button
- Template selector

**Keyboard Shortcuts:**
- `Space`: Play/Pause
- `←/→`: Frame forward/backward
- `Home`: Jump to start
- `End`: Jump to end
- `+/-`: Zoom in/out
- `F`: Toggle fullscreen

---

## 6. AI Chat System

### 6.1 Overview
A complete AI-powered chat interface providing contextual writing assistance, story development support, and creative brainstorming.

### 6.2 Features
**Chat Interface:**
- Persistent chat history
- Context-aware responses
- Project-specific knowledge
- Multi-turn conversations

**AI Capabilities:**
- Story structure advice
- Character development
- Dialogue suggestions
- Plot hole detection
- Writing style feedback
- Beat generation recommendations

**Integration:**
- Accessible from all project views
- References current project context
- Can insert suggestions into editor
- Saves conversation history

### 6.3 Technical Implementation
- Backend API integration
- Streaming responses
- Message persistence
- Context window management

---

## 7. Data Persistence

### 7.1 Storage Strategy

#### 7.1.1 Appwrite + Scriptony HTTP functions
**Architecture:** Three-tier (SPA → Scriptony `functions/*` → Appwrite Databases & Storage)

**Server:**
- Deployed Node (or host-specific) handlers under `functions/` (e.g. `scriptony-projects`, `scriptony-auth`, …)
- Frontend calls them via `VITE_BACKEND_API_BASE_URL` / `VITE_APPWRITE_FUNCTIONS_BASE_URL` and `src/lib/api-gateway.ts`
- Authorization: user **JWT from Appwrite** (`Bearer`), plus optional public token where configured

**Database / storage:**
- **Appwrite Databases** collections mirror former relational entities (projects, shots, timeline nodes, …)
- **Appwrite Storage** buckets for images, audio, etc. (server-side API key only)

**Data stored (examples):**
- Project metadata
- Project content (acts, scenes, chapters)
- Beat configurations
- AI chat history
- User preferences

#### 7.1.2 localStorage
**Used For:**
- Track heights in Playbook
- UI state (zoom level, playhead position)
- Temporary drafts
- Session-specific settings

**Implementation:**
- Per-project keys
- Automatic save on change
- Fallback to defaults if corrupted

### 7.2 Data Models

#### 7.2.1 Project Structure
```typescript
interface Project {
  id: string;
  name: string;
  type: 'film' | 'book';
  created: Date;
  modified: Date;
  settings: ProjectSettings;
  acts: Act[];
  beats: Beat[];
}

interface ProjectSettings {
  actCount: number;
  wordsPerMinute?: number; // For book projects
  beatTemplate?: string;
  // ... other settings
}
```

#### 7.2.2 Beat Structure
```typescript
interface Beat {
  id: string;
  pct_from: number; // 0-100
  pct_to: number;   // 0-100
  label: string;
  color?: string;
  notes?: string;
}
```

#### 7.2.3 Track Heights (localStorage)
```typescript
interface TrackHeights {
  [projectId: string]: {
    [trackId: string]: number; // Height in pixels
  }
}
```

---

## 8. Performance Requirements

### 8.1 Performance SLAs
**Target: "Übertrieben schnell"**

**Key Metrics:**
- Initial page load: < 1.5s
- Timeline render: < 100ms
- Beat resize interaction: < 16ms (60fps)
- Playhead drag: < 16ms (60fps)
- Editor typing latency: < 50ms

### 8.2 Automatic Optimization
**SLA Monitoring:**
- Performance metrics tracked automatically
- Alerts when SLAs are not met
- Automatic code optimization triggers

**Optimization Strategies:**
- React.memo for timeline components
- Virtualization for long timelines
- Debounced resize handlers
- RequestAnimationFrame for animations
- Lazy loading for heavy components

### 8.3 Implementation Details
- Performance budgets enforced
- Lighthouse CI integration
- Real User Monitoring (RUM)
- Automatic rollback on performance regression

---

## 9. Deployment & Infrastructure

### 9.1 Deployment Strategy
**Functions:**
- Deploy `functions/` services to your host (e.g. Appwrite Functions or a Node gateway)
- Server env: `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`, optional bucket/database IDs

**Frontend:**
- `npm run build` → static `build/`
- Set `VITE_APPWRITE_*` and functions base URL at build time (see `docs/DEPLOYMENT.md`)

### 9.2 Environment Variables
**Frontend (`VITE_*`):**
- `VITE_APPWRITE_ENDPOINT`, `VITE_APPWRITE_PROJECT_ID`
- `VITE_BACKEND_API_BASE_URL` or `VITE_APPWRITE_FUNCTIONS_BASE_URL`
- Redirect URLs for auth

**Security:**
- Appwrite API keys and function secrets only on the server
- Browser uses Appwrite project ID + endpoint only (no service key in the SPA)

---

## 10. Technical Stack

### 10.1 Frontend
- **Framework:** React with TypeScript
- **Styling:** Tailwind CSS v4
- **State Management:** React hooks + context
- **Icons:** lucide-react
- **Charts:** recharts (if needed)
- **Animations:** motion/react (Motion)

### 10.2 Backend
- **Runtime:** Node (typical) for `functions/*` handlers
- **Data:** Appwrite Databases + Appwrite Storage (via server SDK)
- **Auth:** Appwrite Auth (SPA SDK); Functions validate JWT / session as implemented in `functions/_shared/auth.ts`

### 10.3 Development
- **Language:** TypeScript
- **Build Tool:** esbuild
- **Package Manager:** npm
- **Code Quality:** ESLint, Prettier

---

## 11. User Workflows

### 11.1 Creating a New Project
1. Click "New Project"
2. Choose project type (Film/Book)
3. Enter project name
4. Configure initial settings:
   - Number of acts
   - Beat template
   - Reading speed (books only)
5. Project created with default structure

### 11.2 Working with Beats (Timeline View)
1. Open Playbook (Timeline)
2. Select beat template or create custom
3. Beats auto-generated on timeline
4. Resize beats using handles:
   - Left handle: Resize beat only
   - Right handle: Resize + ripple all beats to right
5. Enable/disable magnetic snapping
6. Edit beat labels inline
7. Changes auto-saved

### 11.3 Resizing Track Heights
1. Open Playbook
2. Hover over bottom edge of track
3. Cursor changes to resize indicator
4. Click and drag to desired height
5. Release to set height
6. Height saved automatically (localStorage)

### 11.4 Using Fullscreen Mode
1. Click fullscreen button in Timeline toolbar
2. Playbook expands to full viewport
3. Work with maximum visibility
4. Press ESC or click button to exit
5. Return to normal view

---

## 12. Known Constraints & Design Decisions

### 12.1 Beat Display
**Decision:** Beats ONLY shown in Timeline view
**Rationale:** 
- Avoid clutter in writing interface
- Separation of planning vs. writing modes
- Timeline is dedicated planning tool

### 12.2 Ripple Editing Asymmetry
**Decision:** Right handle ripples, left handle doesn't
**Rationale:**
- Matches industry-standard video editors (CapCut, Premiere, DaVinci)
- Most natural for users
- Prevents accidental timeline shifts when trimming starts

### 12.3 Database Migrations
**Constraint:** No DDL/migration files in codebase
**Rationale:**
- Single KV table sufficient for prototyping
- Admins manage schema/data via Appwrite Console (or custom tooling)
- Avoid sync issues between code and DB schema
- Flexible schema in KV store

### 12.4 Manual Edge Function Deployment
**Decision:** Copy-paste deployment via Dashboard (no CLI)
**Rationale:**
- User preference
- Better control over deployment timing
- Visual verification before deploy
- Clear deployment audit trail

---

## 13. Future Considerations

### 13.1 Potential Enhancements
- **Collaboration:** Real-time multi-user editing
- **Version Control:** Git-like branching for drafts
- **Export:** PDF, Final Draft, Fountain formats
- **Import:** Parse existing screenplays
- **Advanced AI:** Scene-by-scene generation
- **Mobile App:** iOS/Android native apps
- **Voice Input:** Dictation for writing
- **Beat Templates:** Expanded library

### 13.2 Scalability Planning
- Performance monitoring at scale
- Database optimization for large projects
- CDN strategy for global users
- Caching layer for frequent queries

---

## 14. Success Metrics

### 14.1 Performance Metrics
- ✅ Timeline loads < 100ms
- ✅ 60fps timeline interactions
- ✅ Zero layout shift during resize
- ✅ Instant localStorage persistence

### 14.2 Feature Completeness
- ✅ Dual project types (Film/Book)
- ✅ Complete beat system with templates
- ✅ CapCut-style ripple editing
- ✅ Resizable track heights
- ✅ Fullscreen Playbook mode
- ✅ Magnetic snapping system
- ✅ AI chat integration
- ✅ Persistent storage (Appwrite + Scriptony functions + localStorage where used)

### 14.3 User Experience Goals
- ✅ "Übertrieben schnell" performance
- ✅ Professional video editor feel
- ✅ No bugs in critical workflows
- ✅ Intuitive beat editing
- ✅ Gapless timeline (no overlaps/gaps)

---

## 15. Bug Fixes & Optimizations (Recent)

### 15.1 Fixed Issues
1. **Beat Resize Overlaps** ✅
   - Implemented CapCut-style ripple editing
   - Right handle now shifts all beats to right
   - Maintains gapless timeline
   
2. **Track Height Persistence** ✅
   - Heights now saved to localStorage
   - Restored on project load
   - Per-project storage keys

3. **Magnet vs. Ripple Confusion** ✅
   - Clarified: Magnet = snapping only
   - Ripple = always active for right handle
   - Independent systems

4. **Performance Optimizations** ✅
   - Debounced resize handlers
   - React.memo on timeline components
   - RequestAnimationFrame for smooth animations

---

## 16. Glossary

**Act:** Major story division (Film: 3-act structure, Book: chapters grouped)  
**Beat:** Story milestone or plot point  
**Playbook:** Timeline editor view  
**Ripple Editing:** Automatic shifting of clips when one is resized  
**Magnetic Snapping:** Automatic alignment to nearby timeline points  
**WPM:** Words Per Minute (reading speed calculation)  
**SLA:** Service Level Agreement (performance targets)  
**KV Store:** Key-Value storage system  

---

## Document Control

**Author:** Scriptony Development Team  
**Reviewers:** Product, Engineering, Design  
**Approval Status:** Approved  
**Next Review Date:** As needed for major features  

---

**End of Document**
