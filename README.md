# 🎓 UofT Course Planner

**Intelligent Course Relationship Visualization with HCI-Enhanced Design**

A modern, interactive course planning tool for University of Toronto students, featuring intelligent relationship analysis and Apple-style design.

## ✨ Features

### 🧠 Intelligent Relationship Analysis
- **Smart Relationship Strength Calculation**: Automatically analyzes course relationships based on path distance and connection density
- **Visual Hierarchy**: Strong relationships are highlighted with deeper colors and larger nodes
- **Intelligent Layout**: Related courses are positioned closer to the center, weak relationships are placed at the edges

### 🔄 Dual Search Modes
- **Prerequisites Mode**: See what courses you need to take before a specific course
- **Postrequisites Mode**: See what advanced courses become available after taking a specific course
- **One-Click Toggle**: Easily switch between modes with the intuitive toggle button

### 🎨 Apple-Style Design
- **Modern Glass Morphism**: Beautiful backdrop blur effects and transparency
- **Smooth Animations**: Fluid transitions and micro-interactions
- **Responsive Layout**: Optimized for all screen sizes
- **Intuitive UX**: Clean, minimal interface following Apple design principles

### 🔍 Enhanced Interactions
- **Hover Tooltips**: Quick course information on hover
- **Click Details**: Full course information with relationship strength indicators
- **Smart Filtering**: Filter by year level and department with intelligent warnings
- **Real-time Search**: Instant course suggestions with autocomplete

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ 
- npm

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/CoursePlanner.git
cd CoursePlanner

# Install dependencies
npm install

# Initialize database
npm run init-db

# Start the server
npm start
```

### Usage
1. Open your browser and navigate to `http://localhost:3001`
2. Enter a course code (e.g., `CSC148H1`)
3. Choose between Prerequisites or Postrequisites mode
4. Explore the interactive course relationship graph
5. Use filters to focus on specific year levels or departments

## 🎯 Use Cases

### For First-Year Students
- **Plan Your Learning Path**: Search for courses you want to take and see what prerequisites you need
- **Understand Course Importance**: Switch to postrequisites mode to see how foundational courses lead to advanced topics

### For Upper-Year Students  
- **Explore Advanced Options**: See what specialized courses become available after completing core requirements
- **Plan Your Specialization**: Understand the relationships between different course streams

### For Academic Advisors
- **Visualize Complex Dependencies**: Quickly understand course relationships across different departments
- **Identify Bottlenecks**: Spot courses that are prerequisites for many advanced courses

## 🔧 Technical Architecture

### Frontend
- **Visualization**: vis.js Network for interactive graphs
- **Styling**: Modern CSS with Apple design language
- **Interactions**: Vanilla JavaScript with event-driven architecture
- **Animations**: CSS transitions and JavaScript animations

### Backend
- **Framework**: Express.js
- **Database**: SQLite with 519 courses and relationships
- **APIs**: RESTful endpoints for course data and relationships

### Key Algorithms
- **Relationship Strength**: O(n²) algorithm considering path distance, direct connections, and connection density
- **Smart Layout**: Physics-based layout with relationship-driven positioning
- **Intelligent Filtering**: Real-time filtering with break detection warnings

## 📊 Data Coverage

- **519 Courses** from multiple departments
- **Thousands of Relationships** between courses
- **Departments**: Computer Science, Mathematics, Physics, Statistics, Actuarial Science, Chemistry, Biology, Economics
- **Year Levels**: First year (1xx) to Graduate level (5xx+)

## 🎨 Design Philosophy

### HCI Principles Applied
1. **Information Hierarchy**: Visual cues help users quickly understand complex relationships
2. **Progressive Disclosure**: Show essential information first, details on demand
3. **Consistency**: Uniform design language throughout the interface
4. **Feedback**: Immediate visual feedback for all user actions

### Visual Design
- **Color Coding**: Strong relationships in deep blue, weak relationships in light gray
- **Size Variation**: Important courses are larger and more prominent
- **Spatial Organization**: Related courses are grouped together
- **Typography**: Clear hierarchy with appropriate font sizes and weights

## 🔮 Future Enhancements

### Planned Features
- [ ] Course difficulty ratings
- [ ] Multi-course search and comparison
- [ ] Learning path recommendations
- [ ] Progress tracking integration
- [ ] Mobile app version

### Technical Improvements
- [ ] Performance optimizations for large datasets
- [ ] Advanced filtering options
- [ ] Export functionality for course plans
- [ ] Integration with UofT course registration system

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup
```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **UofT Arts & Science Calendar** for course data
- **vis.js** for the powerful network visualization library
- **Apple Design Guidelines** for UI/UX inspiration
- **HCI Research** for interaction design principles

---

**Built with ❤️ for UofT students**

*Transform complex course relationships into intuitive visual insights* 