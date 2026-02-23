# A/B Repeat Feature

## Overview

The A/B repeat feature allows users to mark two points (A and B) in an audio track and continuously loop between them. This is useful for practicing specific sections of audio, studying particular segments, or focusing on a favorite part of a track.

## How to Use

### Setting Points

1. Open the full player modal by tapping on the mini player
2. Play the audio and navigate to the position where you want to start the loop
3. Tap the **A** button to set point A (marked with a green indicator)
4. Continue playing or seek to the position where you want to end the loop
5. Tap the **B** button to set point B (marked with a red indicator)

### Activating the Loop

- Once both points A and B are set, tap the **Loop** button to activate A/B repeat
- The audio will now continuously loop between points A and B
- The active loop range is displayed below the seek bar

### Managing A/B Repeat

- **Toggle Loop**: Tap the Loop button to enable/disable the repeat without clearing the points
- **Clear Points**: Use the options menu (⋮) and select "Clear A/B Points" to remove both markers
- **Adjust Points**: You can reset point A or B at any time by tapping the respective button at a new position

## Visual Indicators

- **Green marker**: Point A (loop start)
- **Red marker**: Point B (loop end)
- **Active status**: When A/B repeat is active, the current loop range is displayed in accent color
- **Button colors**: Set points are highlighted in their respective colors (green for A, red for B)

## Constraints

- Point B must be set after point A
- Both points must be set before activating the loop
- A/B repeat is independent of the regular repeat mode
- Points are cleared when switching to a different track

## Implementation Details

- Loop detection happens in real-time during playback
- When playback reaches point B, it automatically seeks back to point A
- The feature uses millisecond precision for accurate looping
- State is managed in AudioContext and persists during the current playback session
