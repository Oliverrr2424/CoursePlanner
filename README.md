# UofT Course Planner

An interactive web application for visualizing University of Toronto course relationships including prerequisites, post-requisites, and exclusions with an Apple-style interface.

## Features

- **Interactive Course Graph**: Visualize course relationships with a modern, hierarchical layout
- **Apple-Style Filtering**: Multi-select filters for year levels and departments
- **Smart Navigation**: Click on courses to navigate through the course network
- **Comprehensive Data**: 519 courses from breadth requirement 5 (The Physical and Mathematical Universes)
- **Modern UI**: Clean, Apple-inspired design with smooth animations

## Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Initialize Database**:
   ```bash
   node database.js
   ```

3. **Start Server**:
   ```bash
   node index.js
   ```

4. **Open Application**:
   Navigate to `http://localhost:3001` in your browser

## Usage

1. Enter a course code (e.g., `CSC148H1`) to generate the course relationship graph
2. Use the year level filter to focus on specific academic levels (1xx-5xx)
3. Use the department filter to show only courses from selected departments
4. Click on any course node to view details and navigate to that course's graph
5. Apply filters to simplify complex graphs or clear them to see all relationships

## Filter Features

- **Year Level Filter**: First Year (1xx), Second Year (2xx), Third Year (3xx), Fourth Year (4xx), Graduate (5xx+)
- **Department Filter**: Computer Science (CSC), Mathematics (MAT), Physics (PHY), Statistics (STA), and more
- **Smart Warnings**: Alerts when filters might hide important prerequisite relationships
- **Apple-Style Tags**: Selected filters displayed as removable blue tags

## Technical Stack

- **Backend**: Node.js, Express.js, SQLite3
- **Frontend**: HTML, CSS, JavaScript, vis-network
- **Data**: Web-scraped from UofT Arts & Science course calendar
- **UI**: Apple-inspired design with custom multi-select components

## Project Structure

```
CoursePlanner/
├── index.js              # Main server file
├── database.js           # Database initialization
├── package.json          # Node.js dependencies
├── public/               # Frontend files
│   ├── index.html        # Main HTML page
│   ├── app.js           # Frontend JavaScript
│   └── style.css        # Styles and animations
├── scraper/             # Data scraping tools
│   ├── scraper.js       # Course data scraper
│   └── package.json     # Scraper dependencies
└── README.md           # This file
```

## Data Source

Course data is scraped from the University of Toronto Arts & Science course calendar, specifically focusing on courses with breadth requirement 5 (The Physical and Mathematical Universes). The application includes:

- Computer Science (CSC): 79 courses
- Mathematics (MAT): 81 courses  
- Physics (PHY): 59 courses
- Statistics (STA): 44 courses
- Other departments: 256 courses
- **Total**: 519 courses

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is for educational purposes. Course data belongs to the University of Toronto. 