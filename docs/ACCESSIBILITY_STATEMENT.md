# CareForge EHR - Accessibility Statement

## Overview
CareForge EHR is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards.

## Conformance Status

### WCAG 2.1 Compliance
| Level | Status | Target Date |
|-------|--------|-------------|
| Level A | ✅ Compliant | Complete |
| Level AA | 🔄 In Progress | Q3 2026 |
| Level AAA | ⏳ Planned | Q4 2026 |

### Section 508 Compliance
- **Status**: Compliant
- **Standard**: Revised Section 508 Standards (2018)
- **Reference**: 36 CFR Part 1194

## Accessibility Features

### Visual Accessibility
- **High Contrast Mode**: Support for high contrast themes
- **Color Independence**: Information not conveyed by color alone
- **Text Resizing**: Support for text zoom up to 200%
- **Screen Reader Support**: ARIA labels and semantic HTML
- **Focus Indicators**: Visible focus indicators for keyboard navigation

### Motor Accessibility
- **Keyboard Navigation**: Full functionality via keyboard
- **Skip Links**: Skip to main content links
- **Large Click Targets**: Minimum 44x44px touch targets
- **No Time Limits**: Adjustable or removable time limits
- **Voice Control**: Compatible with voice control software

### Cognitive Accessibility
- **Clear Language**: Plain language where possible
- **Consistent Navigation**: Predictable navigation patterns
- **Error Prevention**: Confirmation for critical actions
- **Error Recovery**: Clear error messages and recovery paths
- **Progress Indicators**: Multi-step process indicators

### Auditory Accessibility
- **Captions**: Captions for all video content
- **Transcripts**: Text transcripts for audio content
- **Visual Alerts**: Visual alternatives for audio alerts
- **Volume Control**: Adjustable audio volume

## Technical Implementation

### Semantic HTML
```html
<!-- Proper heading hierarchy -->
<h1>Patient Dashboard</h1>
<h2>Recent Encounters</h2>
<h3>Encounter Details</h3>

<!-- Landmark regions -->
<header role="banner">...</header>
<nav role="navigation" aria-label="Main navigation">...</nav>
<main role="main">...</main>
<footer role="contentinfo">...</footer>
```

### ARIA Implementation
```html
<!-- Form labels -->
<label for="patient-name">Patient Name</label>
<input id="patient-name" type="text" aria-required="true">

<!-- Error messages -->
<div role="alert" aria-live="assertive">
  Please enter a valid date of birth.
</div>

<!-- Status updates -->
<div role="status" aria-live="polite">
  Record saved successfully.
</div>
```

### Keyboard Support
- **Tab Order**: Logical tab order through all interactive elements
- **Focus Management**: Focus management for modals and dynamic content
- **Keyboard Shortcuts**: Documented keyboard shortcuts
- **Escape Key**: Close modals and dismiss alerts

## Testing

### Automated Testing
- **Tools**: axe-core, WAVE, Lighthouse
- **Frequency**: Every build (CI/CD integration)
- **Coverage**: All pages and components

### Manual Testing
- **Screen Reader Testing**: NVDA, JAWS, VoiceOver
- **Keyboard Testing**: Full keyboard navigation testing
- **Zoom Testing**: 200% zoom verification
- **High Contrast**: Windows High Contrast mode testing

### User Testing
- **Participants**: Users with disabilities
- **Frequency**: Quarterly
- **Tasks**: Common clinical workflows
- **Feedback**: Incorporated into development backlog

## Known Issues

| Issue | Impact | Status | Target Fix |
|-------|--------|--------|------------|
| Complex table navigation | Screen reader users | 🔄 In Progress | Q3 2026 |
| Chart accessibility | Visual impairment | 🔄 In Progress | Q3 2026 |
| Drag-and-drop alternatives | Motor impairment | ⏳ Planned | Q4 2026 |

## Feedback and Contact

### Accessibility Feedback
- **Email**: accessibility@careforge.health
- **Phone**: 1-800-555-0123
- **Response Time**: 2 business days

### Requesting Accommodations
If you need assistance accessing any content or functionality on CareForge EHR, please contact our accessibility team. We will respond within 2 business days and work to provide the information or assistance you need.

## Assessment Approach

### Self-Evaluation
- **Frequency**: Quarterly
- **Method**: WCAG 2.1 checklist review
- **Documentation**: Assessment reports maintained

### Third-Party Evaluation
- **Frequency**: Annually
- **Provider**: Certified accessibility consultant
- **Report**: Public summary available upon request

## Continuous Improvement

### Development Process
- **Accessibility Requirements**: Included in all user stories
- **Design Reviews**: Accessibility review in design phase
- **Code Reviews**: Accessibility checks in code review
- **Testing**: Accessibility testing in QA process

### Training
- **Developers**: Annual accessibility training
- **Designers**: Inclusive design training
- **QA Team**: Accessibility testing training
- **Content Creators**: Accessible content creation training

## Compatibility

### Supported Assistive Technologies
- **Screen Readers**: NVDA, JAWS, VoiceOver, TalkBack
- **Magnification**: ZoomText, built-in OS magnifiers
- **Voice Control**: Dragon NaturallySpeaking, built-in OS voice control
- **Alternative Input**: Switch devices, eye tracking

### Supported Browsers
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

## Legal Compliance

### Applicable Laws
- **Americans with Disabilities Act (ADA)**: Title III
- **Section 508**: Rehabilitation Act
- **WCAG 2.1**: W3C Web Content Accessibility Guidelines
- **State Laws**: Applicable state accessibility requirements

### Voluntary Product Accessibility Template (VPAT)
A VPAT is available upon request documenting conformance with Section 508 standards.

## Last Updated
2026-07-21
