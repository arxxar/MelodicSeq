# Non-Functional Requirements

## Purpose

These requirements describe quality attributes and operating constraints for
MelodicSeq, a browser-based melodic generative sequencer that produces MIDI for
Ableton Live.

The initial browser target reflects personal development use. Broader browser
support can be defined if the project scope expands.

## Requirements

### Compatibility and operation

- **NFR-01** The application shall be a single webpage implemented with
  standard HTML, CSS, JavaScript, and browser APIs. It shall run in Microsoft
  Edge on Windows 11 without a separate native application installation.
  Mobile and tablet support are out of scope.
- **NFR-02** During the current personal-use development phase, the supported
  browser is Microsoft Edge version 156 or later.
- **NFR-03** MIDI shall be received from and delivered to Ableton Live 12.4
  through the Windows 11 MIDI 2.0 setup (Windows MIDI Services), using only
  MIDI 1.0 messages. MIDI 2.0 Universal MIDI Packets (UMP) are not used.
- **NFR-04** If a required browser capability is unavailable or permission is
  denied, the application shall explain the limitation and provide an actionable
  next step.

### Performance and reliability

- **NFR-05** Playback shall maintain the intended musical timing during normal
  operation on supported browsers. Timing tolerance and test conditions are
  **TBD**.
- **NFR-06** Invalid settings or failed MIDI note reception shall be reported
  clearly; the application shall not silently discard the current pattern.
- **NFR-07** The application shall remain usable after a MIDI reception error
  without requiring a page reload.

### Future phase (not current scope)

- **NFR-17** In a later phase, sequencer timing shall be able to follow external
  MIDI clock from Ableton Live. The synchronization behavior and supported
  browser capabilities are **TBD**.

### Usability and accessibility

- **NFR-08** The main pattern creation, preview, and MIDI delivery actions shall
  be discoverable without technical knowledge of MIDI.
- **NFR-09** Controls shall have labels and shall be operable by keyboard.
- **NFR-10** Error and status messages shall be available to assistive
  technologies and shall not rely on color alone.
- **NFR-11** The interface shall remain usable at common desktop viewport sizes.
  **TBD:** specify supported minimum dimensions.

### Privacy and security

- **NFR-12** The application shall not transmit pattern data or user data
  to a server unless that behavior is explicitly disclosed and required.
- **NFR-13** The application shall access MIDI through the browser's standard
  Web MIDI API on top of the Windows 11 MIDI 2.0 setup, shall use only MIDI 1.0
  messages, and shall explain any required browser permissions or system setup
  to the user.
- **NFR-14** Incoming MIDI messages and user-provided values shall be validated
  before they are used to update or play the pattern.

### Maintainability and verification

- **NFR-15** MIDI note reception and playback shall be covered by automated
  tests, including checks that received pitches are represented in the current
  pattern.
- **NFR-16** Supported browsers, known limitations, and the Ableton Live
  compatibility workflow shall be documented.

## Open quality decisions

- What reference device, pattern size, and timing tolerance define acceptable
  performance?
- What external-clock synchronization behavior is required for the later phase?

## Proposed implementation technologies and libraries

The initial proposal is to keep the webpage small and avoid runtime framework
dependencies:

- **HTML, CSS, and JavaScript ES modules:** implement the page directly with
  standard web technologies.
- **SVG:** render the pattern area, note circles, routing circles, and directed
  vectors. Native SVG and browser pointer events should be sufficient; no
  graphics library is proposed initially.
- **MIDI:** the standard [Web MIDI API](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API)
  provides MIDI 1.0 messages, which matches the requirement. WebMidi.js is an
  optional convenience wrapper; it is only worth adding if the raw API proves
  cumbersome.
- **Automated tests:** Vitest is a candidate for JavaScript unit tests, and
  Playwright is a candidate for end-to-end tests in Edge. These are development
  dependencies, not libraries required by the running webpage.
