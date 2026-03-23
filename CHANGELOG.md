# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- Vercel Web Analytics for visitor metrics tracking
- Mobile responsive layout (controls stack vertically, table scrolls horizontally, reduced spacing)

### Fixed
- Map sometimes loading blank due to race conditions with Mapbox load timing (replaced blind setTimeout with Promise-based approach)
