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
- **FR-07** The first note added to an empty pattern area shall automatically
  become the start note (see FR-18).
- **FR-08** When a note is added, the application shall automatically create
  two vectors between the new note and the active note: one from the active note
  to the new note and one back. The active note is the currently selected note;
  if no note is selected, it is the most recently added note. After the note is
  added, the new note becomes the active note. This also applies while the
  sequencer is playing. The first note added to an empty pattern area has no
  active note and therefore gets no vectors. Routing circles are not given
  automatic vectors.

### Preview and inspection

- **FR-09** The sequencer shall play pattern notes one at a time through the
  configured MIDI output.
- **FR-10** The user interface shall provide Start, Pause, and Stop controls for
  sequencer playback.
- **FR-11** The user interface shall provide a BPM control for setting playback
  tempo.
- **FR-12** The user interface shall provide a timing control for selecting a
  rhythmic subdivision, such as 1/16. Detailed timing behavior is **TBD**.
- **FR-13** The user interface shall provide a Clear control that removes all
  notes from the pattern area.
- **FR-14** The user shall be able to move note circles on the pattern area
  using the mouse before or during playback.
- **FR-15** The user shall be able to draw a directed vector from one note to
  another on the pattern area.
- **FR-16** If vectors exist between the same two notes in both directions,
  each direction shall be drawn separately so both vectors are visible.
- **FR-17** The user shall be able to add circles that do not represent notes.
  These routing circles shall be smaller than note circles and shall be usable
  as intermediate points for routing vectors over longer distances.
- **FR-18** The user shall be able to mark exactly one note as the starting
  point of the sequence, or none. The start note shall be visually highlighted.
- **FR-19** When playback starts, the sequence shall begin with the start note.
  After each note, the next note shall be chosen among all paths that follow the
  outgoing vectors of the current note, continuing through routing circles until
  the next note circle is reached. Each path has a weight derived from its total
  length, and the probability of a path is proportional to its weight; shorter
  paths are more likely. If the current note has no outgoing path, the sequence
  ends. The note currently being played shall be visually indicated.
- **FR-20** The pattern may be edited during playback; changes shall take effect
  from the next step.
- **FR-21** Each note shall have a play probability between 0 % and 100 %
  (default 100 %). The probability is shown by the diameter of the note circle:
  100 % corresponds to the default (full) diameter and 0 % to half of it. The
  user shall be able to change the probability of the selected note in the
  header. When the sequence reaches a note, the note is played with its
  probability; otherwise the step is a rest and the sequence continues along the
  note's outgoing vectors as usual.

### MIDI communication

- **FR-22** The application shall send the current pattern as MIDI to Ableton
  Live 12.4 as MIDI 1.0 messages through the Windows 11 MIDI 2.0 setup.
- **FR-23** The application shall receive MIDI note signals from Ableton Live
  12.4 as MIDI 1.0 messages through the Windows 11 MIDI 2.0 setup.
- **FR-24** Sent MIDI shall represent the pitches in the current pattern.
  **TBD:** define note timing and duration behavior. Until then, velocity and
  note length (as a percentage of one step) are global user settings.
- **FR-25** The user shall be able to select the MIDI input device and the MIDI
  input channel (1â€“16 or Omni), and the MIDI output device and output channel
  (1â€“16). These settings are placed at the bottom of the page and are remembered
  between sessions.
- **FR-26** If MIDI input or output is unavailable, permission is denied, or
  communication fails, the application shall explain the problem and shall not
  indicate that MIDI was received or sent successfully.

## Future phase (not current scope)

- **FR-27** In a later phase, the user shall be able to synchronize sequencer
  timing to external MIDI clock received from Ableton Live. The synchronization
  behavior is **TBD**.
- **FR-28** In a later phase, the user shall be able to save and load patterns.

## Open product decisions

- Are any note-editing operations beyond mouse-based repositioning and adding
  routing circles required?
- What detailed timing behavior should apply, including note order, note
  duration, and the selected rhythmic subdivision?
