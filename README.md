# Time Tracker 🕐

[中文版](README_CN.md) | English

A flexible time management tool based on the Pomodoro Technique with enhanced state switching and personalized configuration.

## ✨ Features

- 🔄 **Flexible State Switching**: No forced state transitions, continue current state after preset time
- ⚙️ **Personalized Configuration**: Customizable focus, rest, reflection durations and failure time
- 📊 **Statistics & Analytics**: Detailed time statistics and historical record analysis
- 🔔 **Smart Notifications**: Desktop notifications and sound alerts support
- 📱 **PWA Support**: Installable app with offline functionality
- 🎨 **Responsive Design**: Perfect adaptation for desktop and mobile devices
- 💾 **Data Persistence**: Local storage with data export/import support
- 🛡️ **Exception Recovery**: Automatic state recovery after app crashes

## 🚀 Quick Start

### Online Access

🌐 **Live Demo**: [https://soft98-top.github.io/time-tracker](https://soft98-top.github.io/time-tracker)

Access the application directly without installation.

### Local Development

```bash
# Clone repository
git clone https://github.com/soft98-top/time-tracker.git
cd time-tracker

# Install dependencies
npm install

# Start development server
npm run dev

# Build production version
npm run build

# Quick deploy to GitHub Pages
npm run deploy:github
```

### 🚀 GitHub Pages Auto Deployment

The project is configured with GitHub Actions auto-deployment workflow:

#### Automation Process
1. **Code Push**: Auto-trigger deployment when pushing to `main` branch
2. **Quality Check**: Automatically run complete test suite
3. **Production Build**: Build optimized production version with Vite
4. **Auto Deploy**: Deploy to GitHub Pages

#### Quick Deployment
```bash
# One-click deployment (recommended)
npm run deploy:github

# Or manual operation
git add .
git commit -m "your commit message"
git push origin main
```

#### Access URLs
- 🌐 **Production**: [https://soft98-top.github.io/time-tracker](https://soft98-top.github.io/time-tracker)
- ⏳ **Deploy Time**: Usually takes 2-5 minutes to complete build and deployment

## 📖 Usage Guide

### Core States

Time Tracker includes four states:

- **Idle**: Initial state, can start focusing
- **Focus**: Work state, concentrate on current task
- **Reflection**: Summarize focus results, improve self-awareness
- **Rest**: Relax and recover, prepare for next focus session

### Core Rules

#### Focus State Rules
- Before "focus failure time": only cancel operation allowed (recorded as focus failure)
- After "focus failure time": can switch to reflection or rest state
- Notification when reaching default focus duration, but can continue focusing

#### Reflection State Rules
- Can switch from focus state
- Notification when reaching default reflection duration
- Can switch to rest state or cancel to idle state

#### Rest State Rules
- Can switch from focus or reflection state
- Notification when reaching default rest duration
- Can switch to focus state or cancel to idle state

## 📊 Statistics

### Time Statistics
- Daily, weekly, monthly focus/reflection/rest duration statistics
- Focus success rate and failure count statistics
- Average focus duration and longest focus record

### History Records
- Detailed session records including start time, end time, duration
- Filter records by state type
- Distinguish between focus failure and success records

## 🛠️ Development

### Tech Stack
- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **Testing**: Vitest + Testing Library
- **Code Standards**: ESLint + TypeScript ESLint

### Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test

# Run tests (single run)
npm run test:run

# Build production version
npm run build

# Code linting
npm run lint

# Preview build result
npm run preview

# Check deployment status
npm run deploy:check
```

## 📚 Documentation

- [User Manual](docs/USER_MANUAL.md) - Detailed usage guide and feature descriptions
- [FAQ](docs/FAQ.md) - Frequently asked questions and troubleshooting
- [Deployment Guide](docs/DEPLOYMENT.md) - Deployment configuration and optimization recommendations

## 📄 License

MIT License