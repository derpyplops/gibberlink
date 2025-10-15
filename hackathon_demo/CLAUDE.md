# GibberLink Hackathon Demo

## Overview

This demo showcases **GibberLink** - an innovative communication system that enables AI agents to communicate with each other using encoded audio signals. The demo simulates a conversation between AI agents representing a hotel booking scenario, where one agent (outbound) calls a hotel on behalf of a client, and another agent (inbound) acts as the hotel receptionist.

## Key Features

- **Dual AI Agent Communication**: Two AI personas (inbound hotel receptionist and outbound booking agent) that can switch between voice conversation and encoded audio communication
- **GibberLink Mode**: A specialized communication protocol using audio-encoded messages for faster, more efficient agent-to-agent communication
- **Real-time Audio Visualization**: Visual feedback during GibberLink mode using AudioMotion-Analyzer
- **Voice AI Integration**: Uses ElevenLabs for natural voice conversation before switching to GibberLink mode
- **Seamless Mode Switching**: Agents can dynamically switch from voice to GibberLink mode during conversation

## Core Technology Stack

### Frontend (Next.js 15 with React 19)
- **Framework**: Next.js with TypeScript
- **UI Components**: Radix UI components with Tailwind CSS styling
- **Audio Processing**: Web Audio API for real-time audio handling
- **Visualization**: AudioMotion-Analyzer for real-time frequency visualization

### Audio Communication
- **GGWave Library**: Encodes/decodes text messages into audio signals
- **Protocol Support**: Multiple encoding protocols (audible fast, fastest, ultrasound)
- **Real-time Processing**: Browser-based audio capture and playback

### AI Integration
- **Voice AI**: ElevenLabs Conversational AI for natural speech
- **Text Generation**: OpenAI GPT-4o-mini for agent responses in GibberLink mode
- **Agent Personas**: Distinct system prompts for inbound/outbound agent roles

## File Structure and Components

### Main Components

**`src/app/page.tsx`** - Main application entry point that renders the ConvAI component

**`src/components/ConvAI.tsx`** - Primary component managing:
- Agent selection (inbound/outbound)
- Voice conversation state management
- GibberLink mode activation and handling
- Audio visualization setup
- Integration between voice AI and text-based communication

**`src/components/AudioMessenger.tsx`** - UI component for manual audio message testing (currently unused in main demo)

### Core Services

**`src/utils/audioUtils.ts`** - Audio processing utilities:
- GGWave integration for encoding/decoding audio messages
- MediaStream management for recording
- Audio context initialization
- Event emission for message handling
- Automatic ping/pong response system

**`src/services/AudioMessengerService.ts`** - Empty service file (placeholder)

### API Endpoints

**`src/app/api/chat/route.ts`** - OpenAI integration:
- Processes agent messages during GibberLink mode
- Maintains conversation context
- Returns AI-generated responses based on agent type

**`src/app/api/signed-url/route.ts`** - ElevenLabs integration:
- Generates signed URLs for voice conversation sessions
- Handles agent ID configuration

### UI Components

**`src/components/ui/`** - Reusable UI components:
- `button.tsx` - Styled button component
- `card.tsx` - Card layout component
- `radio-group.tsx` - Radio button group component

## Demo Flow

1. **Initialization**: User starts with either inbound or outbound agent persona
2. **Voice Conversation**: Agent begins natural voice conversation using ElevenLabs
3. **Mode Detection**: When agents recognize each other as AI, they negotiate switching to GibberLink mode
4. **GibberLink Activation**: Agents use the `gibbMode` tool to switch to audio-encoded communication
5. **Efficient Communication**: Agents exchange information using short, encoded audio messages
6. **Visual Feedback**: Real-time audio visualization shows the communication in progress

## Environment Configuration

Required environment variables:
- `NEXT_PUBLIC_INBOUND_AGENT_ID` - ElevenLabs agent ID for hotel receptionist
- `NEXT_PUBLIC_OUTBOUND_AGENT_ID` - ElevenLabs agent ID for booking agent  
- `XI_API_KEY` - ElevenLabs API key
- `OPENAI_API_KEY` - OpenAI API key for text generation

## Development Commands

- `npm run dev` - Start development server on port 3003 with Turbopack
- `npm run build` - Build production application
- `npm run lint` - Run ESLint code analysis
- `npm start` - Start production server

## Technical Implementation Details

### Audio Encoding/Decoding
- Uses GGWave library to convert text messages to audio waveforms
- Supports multiple protocol speeds (fast, fastest) for different use cases
- Implements collision avoidance using unique sender IDs
- Real-time audio processing using ScriptProcessorNode

### State Management
- React useState for component-level state
- EventEmitter pattern for cross-component audio message handling
- Persistent session IDs for conversation tracking

### Agent Behavior
- Distinct system prompts for each agent type
- Context-aware responses based on conversation history
- Tool integration for mode switching
- Automatic conversation flow management

This demo represents a novel approach to AI agent communication, showcasing how agents can dynamically switch from natural language voice communication to efficient encoded audio protocols for faster information exchange.