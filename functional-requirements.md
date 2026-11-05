# Functional Requirements

## Purpose

MelodicSeq is a browser-based melodic sequencer for personal use. Its pattern
area is a rectangle containing circles that represent note pitches, displayed
using musical note names such as C3. The pattern area starts empty. When an
external MIDI note signal is received, the corresponding note is placed in the
pattern area.

Requirements marked **TBD** need a product decision before they can be treated
as acceptance criteria.

## Scope

- The application runs in Microsoft Edge 156 or later on Windows 11.
- MIDI input and output use the Web MIDI API on top of the Windows 11 MIDI 2.0
  setup, with MIDI 1.0 messages only.
- Mobile and tablet support, a built-in synthesizer, audio recording, MIDI file
  import/export, and direct control of Ableton Live are out of scope.
- Following external MIDI clock from Ableton Live is planned for a later phase,
  not the initial scope.

## Requirements

### Pattern creation

- **FR-01** When the application starts, the pattern area shall be empty.
- **FR-02** The pattern shall be displayed in a rectangular area containing
  circles, with each circle representing a note pitch.
- **FR-03** Each note circle shall display its pitch using a musical note name,
  such as C3.
- **FR-04** When an external MIDI note signal is received, the application shall
  place the corresponding note at a random available position in the pattern
  area, without overlapping any existing note.
- **FR-05** When there is no available position that can fit another note
  without overlap, the application shall not add the received note.
- **FR-06** The same note pitch may be represented by several circles in the
  pattern area. Each circle is an independent element with its own position and
  vectors; a received note is always added as a new circle.

### Preview and inspection

- **FR-07** The sequencer shall play pattern notes one at a time through the
  configured MIDI output.
- **FR-08** The user interface shall provide Start, Pause, and Stop controls for
  sequencer playback.
- **FR-09** The user interface shall provide a BPM control for setting playback
  tempo.
- **FR-10** The user interface shall provide a timing control for selecting a
  rhythmic subdivision, such as 1/16. Detailed timing behavior is **TBD**.
- **FR-11** The user interface shall provide a Clear control that removes all
  notes from the pattern area.
- **FR-12** The user shall be able to move note circles on the pattern area
  using the mouse before or during playback.
- **FR-13** The user shall be able to draw a directed vector from one note to
  another on the pattern area.
- **FR-14** If vectors exist between the same two notes in both directions,
  each direction shall be drawn separately so both vectors are visible.
- **FR-15** The user shall be able to add circles that do not represent notes.
  These routing circles shall be smaller than note circles and shall be usable
  as intermediate points for routing vectors over longer distances.
- **FR-16** The user shall be able to mark exactly one note as the starting
  point of the sequence, or none. The start note shall be visually highlighted.

### MIDI communication

- **FR-17** The application shall send the current pattern as MIDI to Ableton
  Live 12.4 as MIDI 1.0 messages through the Windows 11 MIDI 2.0 setup.
- **FR-18** The application shall receive MIDI note signals from Ableton Live
  12.4 as MIDI 1.0 messages through the Windows 11 MIDI 2.0 setup.
- **FR-19** Sent MIDI shall represent the pitches in the current pattern.
  **TBD:** define note timing and duration behavior.
- **FR-20** If MIDI input or output is unavailable, permission is denied, or
  communication fails, the application shall explain the problem and shall not
  indicate that MIDI was received or sent successfully.

## Future phase (not current scope)

- **FR-21** In a later phase, the user shall be able to synchronize sequencer
  timing to external MIDI clock received from Ableton Live. The synchronization
  behavior is **TBD**.
- **FR-22** In a later phase, the user shall be able to save and load patterns.

## Open product decisions

- Are any note-editing operations beyond mouse-based repositioning and adding
  routing circles required?
- What detailed timing behavior should apply, including note order, note
  duration, and the selected rhythmic subdivision?
