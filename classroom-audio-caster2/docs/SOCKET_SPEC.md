# Inter-Process Audio Socket Specification

## Overview
This document specifies the inter-process communication (IPC) interface between the macOS native audio capture engine (`capture-macos`) and the streaming backend server (`server-go`).

## Transport
- **Socket Type:** Unix Domain Socket (Stream)
- **Path:** `/tmp/classroom_audio.sock`

## Audio Stream Format
The native Swift capture engine writes uncompressed raw PCM audio continuously over the socket:

| Property | Value | Notes |
| :--- | :--- | :--- |
| **Sample Rate** | `48000 Hz` | Standard broadcast audio clock |
| **Channels** | `2` | Stereo (Left / Right interleaved) |
| **Format** | `Float32` | 32-bit floating point PCM |
| **Endianness** | Little-Endian | Native Apple Silicon / Intel byte ordering |
| **Bitrate** | `3,072 kbps` | 48,000 samples/sec * 2 channels * 4 bytes/sample |

## Framing & Data Alignment
- Audio data is written sequentially as a raw byte stream without container headers (raw PCM).
- Each stereo audio frame consists of 8 bytes:
  - `bytes[0..3]`: Left channel sample (`Float32`, little-endian)
  - `bytes[4..7]`: Right channel sample (`Float32`, little-endian)
- Readers should buffer and decode in multiples of 8 bytes to preserve channel alignment.
